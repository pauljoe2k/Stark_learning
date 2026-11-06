#!/usr/bin/env bash
#
# Pinpoint — pull the latest main and start the whole stack with one command.
#
#   npm run start:all                 pull, install, infra, migrate, start
#   npm run start:all -- --seed       also re-run the demo seed
#   npm run start:all -- --no-pull    skip git pull
#   npm run start:all -- --no-seed    never seed, even on a first run
#   npm run start:all -- --no-install skip npm install even if stale
#   npm run start:all -- --skip-infra use an already-running Postgres/Redis
#   bash scripts/start.sh --help
#
# What it does, in order:
#   1. git pull --ff-only        (refuses to run on a dirty tree)
#   2. npm install               (only when node_modules is missing or stale)
#   3. apps/api/.env + apps/web/.env, generating a real JWT_SECRET
#   4. docker compose up -d postgres redis, then wait for both ports
#   5. prisma generate + migrate deploy, and seed on the very first run
#   6. npm run dev:all           (API :4100, worker, web :5180)
#
# Requires bash 4+ and Node 20+. Docker is optional: without it the script expects
# Postgres on 5433 and Redis on 6380 and tells you exactly what to start.
# On Windows, run this from Git Bash (it ships with Git for Windows).

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

PG_PORT=5433
REDIS_PORT=6380
SEED_MARKER="node_modules/.cache/pinpoint-seeded"
INFRA_TIMEOUT="${PINPOINT_INFRA_TIMEOUT_MS:-60000}"
INFRA_TIMEOUT=$(( INFRA_TIMEOUT / 1000 ))

DO_PULL=1
DO_INSTALL=1
DO_INFRA=1
SEED_MODE="auto"   # auto | force | never

for arg in "$@"; do
  case "$arg" in
    --seed)       SEED_MODE="force" ;;
    --no-seed)    SEED_MODE="never" ;;
    --no-pull)    DO_PULL=0 ;;
    --no-install) DO_INSTALL=0 ;;
    --skip-infra) DO_INFRA=0 ;;
    -h|--help)    sed -n '2,26p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

# ---------------------------------------------------------------- output helpers
if [ -t 1 ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; OFF=$'\033[0m'
else
  BOLD=''; DIM=''; GREEN=''; YELLOW=''; RED=''; OFF=''
fi

STEP=0
step() { STEP=$(( STEP + 1 )); printf '\n%s[%d] %s%s\n' "$BOLD" "$STEP" "$1" "$OFF"; }
ok()   { printf '    %sok%s  %s\n' "$GREEN" "$OFF" "$1"; }
skip() { printf '    %s--%s  %s\n' "$DIM" "$OFF" "$1"; }
warn() { printf '    %s!!%s  %s\n' "$YELLOW" "$OFF" "$1"; }

die() {
  printf '\n    %sxx%s  %s\n' "$RED" "$OFF" "$1" >&2
  if [ -n "${2:-}" ]; then printf '\n%s\n' "$2" >&2; fi
  exit 1
}

have() { command -v "$1" >/dev/null 2>&1; }

# ---------------------------------------------------------------- 1. pull
pull_latest() {
  step "Pull latest"
  if [ "$DO_PULL" -eq 0 ]; then skip "skipped (--no-pull)"; return; fi
  if ! have git; then skip "git not installed"; return; fi
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then skip "not a git checkout"; return; fi

  local status
  status="$(git status --porcelain)"
  if [ -n "$status" ]; then
    warn "working tree has uncommitted changes — not pulling"
    printf '%s\n' "$status" | sed 's/^/        /'
    skip "commit or stash, then run again (or use --no-pull)"
    return
  fi

  if ! git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    skip "current branch has no upstream to pull from"
    return
  fi

  local before after
  before="$(git rev-parse HEAD)"
  if ! git pull --ff-only; then
    warn "git pull --ff-only did not fast-forward"
    skip "continuing on the current commit"
    return
  fi
  after="$(git rev-parse HEAD)"
  if [ "$before" = "$after" ]; then
    ok "already up to date ($(printf '%.7s' "$after"))"
  else
    ok "updated $(printf '%.7s' "$before") -> $(printf '%.7s' "$after")"
  fi
}

# ---------------------------------------------------------------- 2. install
ensure_dependencies() {
  step "Install dependencies"
  if [ "$DO_INSTALL" -eq 0 ]; then skip "skipped (--no-install)"; return; fi

  local marker="node_modules/.package-lock.json"
  local stale=0
  [ -d node_modules ] || stale=1
  [ -f "$marker" ] || stale=1
  if [ -f package-lock.json ] && [ -f "$marker" ] && [ package-lock.json -nt "$marker" ]; then stale=1; fi
  if [ "$stale" -eq 0 ]; then skip "node_modules is up to date"; return; fi

  # The committed lockfile resolves some packages from registry.npmmirror.com.
  # Rewriting mirror hosts keeps installs working on any network without
  # touching the lockfile (same intent as the repo's .npmrc).
  npm install --no-audit --no-fund --replace-registry-host=always \
    || die "npm install failed." "Check your network, then retry."
  ok "dependencies installed"
}

# ---------------------------------------------------------------- 3. env files
gen_secret() {
  if have openssl; then
    openssl rand -hex 32
  else
    od -An -tx1 -N32 /dev/urandom | tr -d ' \n'
  fi
}

ensure_env() {
  step "Environment files"

  local api_env="apps/api/.env" api_example="apps/api/.env.example"
  if [ ! -f "$api_env" ]; then
    [ -f "$api_example" ] || die "apps/api/.env.example is missing — cannot create .env."
    local secret
    secret="$(gen_secret)"
    # 64 hex chars; apps/api/src/config.ts requires JWT_SECRET to be >= 32.
    sed "s|^JWT_SECRET=.*|JWT_SECRET=${secret}|" "$api_example" > "$api_env" \
      || die "could not write apps/api/.env"
    ok "created apps/api/.env with a fresh 64-character JWT_SECRET"
  else
    local jwt
    jwt="$(sed -n 's/^JWT_SECRET=//p' "$api_env" | head -n1)"
    if [ "${#jwt}" -lt 32 ]; then
      warn "apps/api/.env has a JWT_SECRET shorter than 32 characters — the API will refuse to start"
    elif printf '%s' "$jwt" | grep -q 'replace-this-with'; then
      warn "apps/api/.env still has the placeholder JWT_SECRET — fine locally, never for a demo build"
    else
      ok "apps/api/.env present"
    fi
  fi

  if [ ! -f apps/web/.env ]; then
    printf 'VITE_API_URL=http://localhost:4100\nWEB_PORT=5180\n' > apps/web/.env
    ok "created apps/web/.env (API http://localhost:4100, web port 5180)"
  else
    ok "apps/web/.env present"
  fi

  if grep -qE '^GEMINI_API_KEY=[[:space:]]*$' "$api_env"; then
    warn "GEMINI_API_KEY is empty — Explain and extraction will use the keyword fallback, not Gemini"
  fi
}

# ---------------------------------------------------------------- 4. infra
port_open() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1
}

wait_for_port() {
  local port="$1" deadline=$(( SECONDS + INFRA_TIMEOUT ))
  while [ "$SECONDS" -lt "$deadline" ]; do
    if port_open "$port"; then return 0; fi
    sleep 0.7
  done
  return 1
}

ensure_infra() {
  step "Postgres and Redis"
  if [ "$DO_INFRA" -eq 0 ]; then skip "skipped (--skip-infra)"; return; fi

  local compose=""
  if have docker && docker compose version >/dev/null 2>&1; then
    compose="docker compose"
  elif have docker-compose; then
    compose="docker-compose"
  fi

  if [ -n "$compose" ]; then
    # Only the two datastores: the API, worker and web run locally in step 6.
    if $compose up -d postgres redis; then
      ok "$compose up -d postgres redis"
    else
      warn "$compose up failed — checking whether the ports are already served"
    fi
  else
    warn "Docker Compose not found — expecting Postgres and Redis to be running already"
  fi

  local pg=0 redis=0
  wait_for_port "$PG_PORT" && pg=1
  wait_for_port "$REDIS_PORT" && redis=1
  [ "$pg" -eq 1 ] && ok "PostgreSQL reachable on :$PG_PORT"
  [ "$redis" -eq 1 ] && ok "Redis reachable on :$REDIS_PORT"

  if [ "$pg" -eq 0 ] || [ "$redis" -eq 0 ]; then
    local missing=""
    [ "$pg" -eq 0 ] && missing="PostgreSQL :$PG_PORT"
    if [ "$redis" -eq 0 ]; then
      missing="${missing:+$missing and }Redis :$REDIS_PORT"
    fi
    die "$missing not reachable." "Start them with one of:

  docker compose up -d postgres redis        # if you have Docker
  docker run -d --name pinpoint-pg -p ${PG_PORT}:5432 \\
    -e POSTGRES_USER=pinpoint -e POSTGRES_PASSWORD=pinpoint \\
    -e POSTGRES_DB=pinpoint postgres:16-alpine
  docker run -d --name pinpoint-redis -p ${REDIS_PORT}:6379 redis:7-alpine

Or point apps/api/.env at databases you already run, then re-run with --skip-infra.
See docs/LOCAL_SETUP.md, section \"Without Docker\"."
  fi
}

# ---------------------------------------------------------------- 5. database
ensure_database() {
  step "Database schema"
  npm run db:generate || die "prisma generate failed."
  ok "Prisma Client generated"

  if ! npm run db:migrate; then
    die "prisma migrate deploy failed." "Most often DATABASE_URL in apps/api/.env points somewhere unreachable,
or the database has drifted from prisma/migrations.

  cd apps/api && npx prisma migrate status"
  fi
  ok "migrations applied"

  local first_run=0
  [ -f "$SEED_MARKER" ] || first_run=1

  case "$SEED_MODE" in
    never)
      skip "seed skipped (--no-seed)"
      ;;
    force)
      if npm run db:seed; then
        mkdir -p "$(dirname "$SEED_MARKER")" && date -u +%FT%TZ > "$SEED_MARKER"
        ok "demo data seeded"
      else
        warn "seed failed — the API will still start, but the demo account may be missing"
      fi
      ;;
    auto)
      if [ "$first_run" -eq 1 ]; then
        if npm run db:seed; then
          mkdir -p "$(dirname "$SEED_MARKER")" && date -u +%FT%TZ > "$SEED_MARKER"
          ok "demo data seeded (first run)"
        else
          warn "seed failed — the API will still start, but the demo account may be missing"
        fi
      else
        skip "already seeded on a previous run (use --seed to force)"
      fi
      ;;
  esac
}

# ---------------------------------------------------------------- 6. start
start_stack() {
  step "Start API, worker and web"
  printf '\n    API   %shttp://localhost:4100%s   %s/health  /ready%s\n' "$BOLD" "$OFF" "$DIM" "$OFF"
  printf '    Web   %shttp://localhost:5180%s\n\n' "$BOLD" "$OFF"
  printf '    %sCtrl+C stops everything.%s\n\n' "$DIM" "$OFF"

  # exec so Ctrl+C goes straight to npm, which tears down api/worker/web.
  exec npm run dev:all
}

# ---------------------------------------------------------------- main
printf '%s\n' "${BOLD}Pinpoint — pull and start${OFF}"
printf '%s\n' "${DIM}  $ROOT${OFF}"

pull_latest
ensure_dependencies
ensure_env
ensure_infra
ensure_database
start_stack
