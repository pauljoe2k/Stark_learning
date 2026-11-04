#!/usr/bin/env bash
set -u

BASE="${BASE:-http://localhost:4000}"
TMP_DIR="$(mktemp -d)"
PNG="$TMP_DIR/palace.png"
BODY="$TMP_DIR/response.json"
FAILURES=0

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=' | base64 -d > "$PNG"

request() {
  curl -sS -o "$BODY" -w '%{http_code}' "$@"
}

check_status() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    printf 'PASS %s (actual %s, expected %s)\n' "$label" "$actual" "$expected"
  else
    printf 'FAIL %s (actual %s, expected %s)\n' "$label" "$actual" "$expected"
    cat "$BODY"
    printf '\n'
    FAILURES=$((FAILURES + 1))
  fi
}

check_body() {
  local label="$1" expected="$2"
  if grep -Fq "$expected" "$BODY"; then
    printf 'PASS %s (body contains %s)\n' "$label" "$expected"
  else
    printf 'FAIL %s (body missing %s)\n' "$label" "$expected"
    cat "$BODY"
    printf '\n'
    FAILURES=$((FAILURES + 1))
  fi
}

actual="$(request "$BASE/health")"
check_status 'GET /health' 200 "$actual"

actual="$(request -X POST "$BASE/places" -H 'x-dev-user-id: 1' -F 'name=Palace Test')"
check_status 'POST /places without image' 400 "$actual"

actual="$(request -X POST "$BASE/places" -H 'x-dev-user-id: 1' -F 'name=Palace Test' -F "image=@$PNG;type=image/png")"
check_status 'POST /places with image' 201 "$actual"
PLACE_ID="$(grep -oE '"id":[0-9]+' "$BODY" | head -n 1 | cut -d: -f2)"
PLACE_ID="${PLACE_ID:-0}"
check_body 'Created place response' '"imageUrl":'

actual="$(request "$BASE/places" -H 'x-dev-user-id: 1')"
check_status 'GET /places' 200 "$actual"
check_body 'GET /places includes created place' "\"id\":$PLACE_ID"
check_body 'GET /places includes flag count' '"_count":{"flags":0}'

actual="$(request "$BASE/places/$PLACE_ID" -H 'x-dev-user-id: 1')"
check_status 'GET /places/:id' 200 "$actual"
check_body 'GET /places/:id has flags array' '"flags":[]'

actual="$(request -X PATCH "$BASE/places/$PLACE_ID" -H 'x-dev-user-id: 1' -H 'Content-Type: application/json' --data '{"name":"Renamed Palace"}')"
check_status 'PATCH /places/:id rename' 200 "$actual"
check_body 'PATCH /places/:id returns renamed place' '"name":"Renamed Palace"'

FLAG_DATA="{\"placeId\":$PLACE_ID,\"x\":24.5,\"y\":61,\"title\":\"First flag\",\"note\":\"First note\",\"emoji\":\"📍\"}"
actual="$(request -X POST "$BASE/flags" -H 'x-dev-user-id: 1' -H 'Content-Type: application/json' --data "$FLAG_DATA")"
check_status 'POST /flags valid (first)' 201 "$actual"
FLAG_ID="$(grep -oE '"id":[0-9]+' "$BODY" | head -n 1 | cut -d: -f2)"
FLAG_ID="${FLAG_ID:-0}"

actual="$(request -X POST "$BASE/flags" -H 'x-dev-user-id: 1' -H 'Content-Type: application/json' --data "$FLAG_DATA")"
check_status 'POST /flags valid (second)' 201 "$actual"
SECOND_FLAG_ID="$(grep -oE '"id":[0-9]+' "$BODY" | head -n 1 | cut -d: -f2)"
SECOND_FLAG_ID="${SECOND_FLAG_ID:-0}"

actual="$(request -X POST "$BASE/flags" -H 'x-dev-user-id: 1' -H 'Content-Type: application/json' --data "{\"placeId\":$PLACE_ID,\"x\":150,\"y\":20,\"title\":\"Out of bounds\"}")"
check_status 'POST /flags with x=150' 400 "$actual"

actual="$(request -X POST "$BASE/flags" -H 'x-dev-user-id: 1' -H 'Content-Type: application/json' --data "{\"placeId\":$PLACE_ID,\"x\":20,\"y\":20}")"
check_status 'POST /flags missing title' 400 "$actual"

actual="$(request -X PATCH "$BASE/flags/$FLAG_ID" -H 'x-dev-user-id: 1' -H 'Content-Type: application/json' --data '{"title":"Updated flag"}')"
check_status 'PATCH /flags/:id' 200 "$actual"
check_body 'PATCH /flags/:id returns new title' '"title":"Updated flag"'

actual="$(request "$BASE/places/$PLACE_ID" -H 'x-dev-user-id: 2')"
check_status 'User 2 GET /places/:id' 404 "$actual"

actual="$(request -X POST "$BASE/flags" -H 'x-dev-user-id: 2' -H 'Content-Type: application/json' --data "$FLAG_DATA")"
check_status 'User 2 POST /flags to another place' 404 "$actual"

actual="$(request -X DELETE "$BASE/flags/$FLAG_ID" -H 'x-dev-user-id: 2')"
check_status 'User 2 DELETE /flags/:id' 404 "$actual"

actual="$(request -X DELETE "$BASE/flags/$FLAG_ID" -H 'x-dev-user-id: 1')"
check_status 'DELETE /flags/:id' 204 "$actual"

actual="$(request "$BASE/places/$PLACE_ID" -H 'x-dev-user-id: 1')"
check_status 'GET /places/:id after flag deletion' 200 "$actual"
check_body 'Place has one fewer flag' "\"id\":$SECOND_FLAG_ID"
if [ "$(grep -o '"placeId":[0-9]*' "$BODY" | wc -l | tr -d ' ')" = 1 ]; then
  printf 'PASS Deleted flag count is reduced to one\n'
else
  printf 'FAIL Deleted flag count is not one\n'
  cat "$BODY"
  printf '\n'
  FAILURES=$((FAILURES + 1))
fi

actual="$(request -X DELETE "$BASE/places/$PLACE_ID" -H 'x-dev-user-id: 1')"
check_status 'DELETE /places/:id' 204 "$actual"

actual="$(request "$BASE/places/$PLACE_ID" -H 'x-dev-user-id: 1')"
check_status 'GET /places/:id after deletion' 404 "$actual"

if [ "$FAILURES" -ne 0 ]; then
  printf 'Palace API tests failed: %s case(s).\n' "$FAILURES"
  exit 1
fi
printf 'All Palace API tests passed.\n'
