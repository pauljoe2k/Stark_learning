#!/usr/bin/env node
/**
 * Pinpoint — pull the latest main and start the whole stack with one command.
 *
 *   npm run start:all            pull, install, infra, migrate, start
 *   npm run start:all -- --seed  also re-run the demo seed
 *   npm run start:all -- --no-pull      skip git pull
 *   npm run start:all -- --no-seed      never seed, even on a first run
 *   npm run start:all -- --skip-infra   use an already-running Postgres/Redis
 *   npm run start:all -- --no-install   skip npm install even if stale
 *
 * What it does, in order:
 *   1. git pull --ff-only        (refuses to run on a dirty tree)
 *   2. npm install               (only when node_modules is missing or stale)
 *   3. apps/api/.env + apps/web/.env, generating a real JWT_SECRET
 *   4. docker compose up -d postgres redis, then wait for both ports
 *   5. prisma generate + migrate deploy, and seed on the very first run
 *   6. npm run dev:all           (API :4100, worker, web :5180)
 *
 * Requires Node 20+. Docker is optional: without it the script expects Postgres
 * on 5433 and Redis on 6380 and tells you exactly what to start if they are down.
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';
const flags = new Set(process.argv.slice(2));
const has = (f) => flags.has(f);

const PG_PORT = 5433;
const REDIS_PORT = 6380;
const SEED_MARKER = path.join(ROOT, 'node_modules', '.cache', 'pinpoint-seeded');
// Override to fail faster in CI: PINPOINT_INFRA_TIMEOUT_MS=3000
const INFRA_TIMEOUT_MS = Number(process.env.PINPOINT_INFRA_TIMEOUT_MS ?? 60_000);

// ---------------------------------------------------------------- output helpers
const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};
let stepNo = 0;
const step = (title) => console.log(`\n${c.bold(`[${++stepNo}] ${title}`)}`);
const ok = (msg) => console.log(`    ${c.green('ok')}  ${msg}`);
const skip = (msg) => console.log(`    ${c.dim('--')}  ${msg}`);
const warn = (msg) => console.log(`    ${c.yellow('!!')}  ${msg}`);

function die(msg, hint) {
  console.error(`\n    ${c.red('xx')}  ${msg}`);
  if (hint) console.error(`\n${hint}\n`);
  process.exit(1);
}

function run(cmd, args, { allowFail = false, capture = false } = {}) {
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: capture ? 'pipe' : 'inherit',
    shell: isWin,
    encoding: 'utf8',
  });
  if (res.status !== 0 && !allowFail) {
    die(`\`${cmd} ${args.join(' ')}\` failed with exit code ${res.status}.`);
  }
  return { code: res.status, out: (res.stdout ?? '') + (res.stderr ?? '') };
}

// ---------------------------------------------------------------- 1. pull
function pullLatest() {
  step('Pull latest');
  if (has('--no-pull')) return skip('skipped (--no-pull)');

  const inside = run('git', ['rev-parse', '--is-inside-work-tree'], { allowFail: true, capture: true });
  if (inside.code !== 0) return skip('not a git checkout');

  const status = run('git', ['status', '--porcelain'], { capture: true }).out.trim();
  if (status) {
    warn('working tree has uncommitted changes — not pulling');
    console.log(status.split('\n').map((l) => `        ${l}`).join('\n'));
    return skip('commit or stash, then run again (or use --no-pull)');
  }

  const upstream = run('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], {
    allowFail: true,
    capture: true,
  });
  if (upstream.code !== 0) return skip('current branch has no upstream to pull from');

  const before = run('git', ['rev-parse', 'HEAD'], { capture: true }).out.trim();
  const res = run('git', ['pull', '--ff-only'], { allowFail: true, capture: true });
  if (res.code !== 0) {
    warn('git pull --ff-only did not fast-forward');
    console.log(res.out.split('\n').map((l) => `        ${l}`).join('\n'));
    return skip('continuing on the current commit');
  }
  const after = run('git', ['rev-parse', 'HEAD'], { capture: true }).out.trim();
  ok(before === after ? 'already up to date' : `updated ${before.slice(0, 7)} -> ${after.slice(0, 7)}`);
}

// ---------------------------------------------------------------- 2. install
function ensureDependencies() {
  step('Install dependencies');
  if (has('--no-install')) return skip('skipped (--no-install)');

  const nodeModules = path.join(ROOT, 'node_modules');
  const installedMarker = path.join(nodeModules, '.package-lock.json');
  const lockfile = path.join(ROOT, 'package-lock.json');
  const stale =
    !existsSync(nodeModules) ||
    !existsSync(installedMarker) ||
    (existsSync(lockfile) && statSync(lockfile).mtimeMs > statSync(installedMarker).mtimeMs);

  if (!stale) return skip('node_modules is up to date');

  // The committed lockfile resolves some packages from registry.npmmirror.com.
  // Rewriting mirror hosts to the public registry keeps installs working on any
  // network without touching the lockfile (same intent as the repo's .npmrc).
  run(npm, ['install', '--no-audit', '--no-fund', '--replace-registry-host=always']);
  ok('dependencies installed');
}

// ---------------------------------------------------------------- 3. env files
function ensureEnv() {
  step('Environment files');

  const apiEnv = path.join(ROOT, 'apps/api/.env');
  const apiExample = path.join(ROOT, 'apps/api/.env.example');
  if (!existsSync(apiEnv)) {
    if (!existsSync(apiExample)) die('apps/api/.env.example is missing — cannot create .env.');
    copyFileSync(apiExample, apiEnv);
    const secret = randomBytes(32).toString('hex'); // 64 chars; config.ts requires >= 32
    const text = readFileSync(apiEnv, 'utf8').replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
    writeFileSync(apiEnv, text);
    ok('created apps/api/.env with a fresh 64-character JWT_SECRET');
  } else {
    const text = readFileSync(apiEnv, 'utf8');
    const match = /^JWT_SECRET=(.*)$/m.exec(text);
    if (!match || match[1].trim().length < 32) {
      warn('apps/api/.env has a JWT_SECRET shorter than 32 characters — the API will refuse to start');
    } else if (match[1].includes('replace-this-with')) {
      warn('apps/api/.env still has the placeholder JWT_SECRET — fine locally, never for a demo build');
    } else {
      ok('apps/api/.env present');
    }
  }

  const webEnv = path.join(ROOT, 'apps/web/.env');
  if (!existsSync(webEnv)) {
    writeFileSync(webEnv, 'VITE_API_URL=http://localhost:4100\nWEB_PORT=5180\n');
    ok('created apps/web/.env (API http://localhost:4100, web port 5180)');
  } else {
    ok('apps/web/.env present');
  }

  const apiText = readFileSync(apiEnv, 'utf8');
  if (/^GEMINI_API_KEY=\s*$/m.test(apiText)) {
    warn('GEMINI_API_KEY is empty — Explain and extraction will use the keyword fallback, not Gemini');
  }
}

// ---------------------------------------------------------------- 4. infra
function detectCompose() {
  for (const [cmd, prefix] of [['docker', ['compose']], ['docker-compose', []]]) {
    try {
      execFileSync(cmd, [...prefix, 'version'], { stdio: 'ignore' });
      return { cmd, prefix };
    } catch {
      /* try the next one */
    }
  }
  return null;
}

function waitForPort(port, label, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const attempt = () => {
      const socket = net.connect({ host: '127.0.0.1', port });
      socket.setTimeout(1500);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      const retry = () => {
        socket.destroy();
        if (Date.now() > deadline) resolve(false);
        else setTimeout(attempt, 700);
      };
      socket.once('error', retry);
      socket.once('timeout', retry);
    };
    attempt();
  });
}

async function ensureInfra() {
  step('Postgres and Redis');
  if (has('--skip-infra')) {
    skip('skipped (--skip-infra)');
    return;
  }

  const compose = detectCompose();
  if (compose) {
    // Only the two datastores: the API, worker and web run locally in step 6.
    run(compose.cmd, [...compose.prefix, 'up', '-d', 'postgres', 'redis'], { allowFail: true });
    ok(`docker ${compose.prefix.join(' ')} up -d postgres redis`.replace(/\s+/g, ' '));
  } else {
    warn('Docker Compose not found — expecting Postgres and Redis to be running already');
  }

  const pg = await waitForPort(PG_PORT, 'PostgreSQL', INFRA_TIMEOUT_MS);
  const redis = await waitForPort(REDIS_PORT, 'Redis', INFRA_TIMEOUT_MS);
  if (pg) ok(`PostgreSQL reachable on :${PG_PORT}`);
  if (redis) ok(`Redis reachable on :${REDIS_PORT}`);

  if (!pg || !redis) {
    const missing = [!pg && `PostgreSQL :${PG_PORT}`, !redis && `Redis :${REDIS_PORT}`].filter(Boolean);
    die(
      `${missing.join(' and ')} not reachable.`,
      [
        'Start them with one of:',
        '',
        `  docker compose up -d postgres redis        ${c.dim('# if you have Docker')}`,
        `  docker run -d --name pinpoint-pg -p ${PG_PORT}:5432 -e POSTGRES_USER=pinpoint -e POSTGRES_PASSWORD=pinpoint -e POSTGRES_DB=pinpoint postgres:16-alpine`,
        `  docker run -d --name pinpoint-redis -p ${REDIS_PORT}:6379 redis:7-alpine`,
        '',
        'Or point apps/api/.env at databases you already run, then re-run with --skip-infra.',
        c.dim('See docs/LOCAL_SETUP.md, section "Without Docker".'),
      ].join('\n')
    );
  }
}

// ---------------------------------------------------------------- 5. database
function ensureDatabase() {
  step('Database schema');
  run(npm, ['run', 'db:generate']);
  ok('Prisma Client generated');

  const migrate = run(npm, ['run', 'db:migrate'], { allowFail: true });
  if (migrate.code !== 0) {
    die(
      'prisma migrate deploy failed.',
      [
        'Most often this means DATABASE_URL in apps/api/.env points somewhere unreachable,',
        'or the database has drifted from prisma/migrations.',
        '',
        '  cd apps/api && npx prisma migrate status',
      ].join('\n')
    );
  }
  ok('migrations applied');

  const firstRun = !existsSync(SEED_MARKER);
  if (has('--no-seed')) {
    skip('seed skipped (--no-seed)');
  } else if (firstRun || has('--seed')) {
    const seed = run(npm, ['run', 'db:seed'], { allowFail: true });
    if (seed.code === 0) {
      ok(firstRun ? 'demo data seeded (first run)' : 'demo data seeded');
      mkdirSync(path.dirname(SEED_MARKER), { recursive: true });
      writeFileSync(SEED_MARKER, new Date().toISOString());
    } else {
      warn('seed failed — the API will still start, but the demo account may be missing');
    }
  } else {
    skip('already seeded on a previous run (use --seed to force)');
  }
}

// ---------------------------------------------------------------- 6. start
function startStack() {
  step('Start API, worker and web');
  console.log(
    [
      '',
      `    API   ${c.bold('http://localhost:4100')}   ${c.dim('/health  /ready')}`,
      `    Web   ${c.bold('http://localhost:5180')}`,
      '',
      c.dim('    Ctrl+C stops everything.'),
      '',
    ].join('\n')
  );

  const child = spawn(npm, ['run', 'dev:all'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: isWin,
    env: process.env,
  });

  const forward = (signal) => () => {
    if (child.exitCode === null) child.kill(signal);
  };
  process.once('SIGINT', forward('SIGINT'));
  process.once('SIGTERM', forward('SIGTERM'));
  child.on('exit', (code) => process.exit(code ?? 0));
}

// ---------------------------------------------------------------- main
try {
  console.log(c.bold('\nPinpoint — pull and start\n') + c.dim(`  ${ROOT}`));
  pullLatest();
  ensureDependencies();
  ensureEnv();
  await ensureInfra();
  ensureDatabase();
  startStack();
} catch (error) {
  die(error instanceof Error ? error.message : String(error));
}
