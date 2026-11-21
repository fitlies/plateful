#!/bin/sh
# Stop hook: when app code changed, run the tests before Claude may finish.
# Exit 2 sends the failure back to Claude to fix (exit 1 would let it finish anyway).
# Gives up after 3 blocked stops in one session, so a stuck suite can't loop forever.
# TEST_CMD overrides the command (used to self-test this script).
input=$(cat)
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

# Nothing to check if no code, config or deps changed.
git status --porcelain -- src index.html vite.config.ts tsconfig.json package.json package-lock.json | grep -q . || exit 0

out=$(${TEST_CMD:-npm test --silent} </dev/null 2>&1) && exit 0

sid=$(printf '%s' "$input" | grep -o '"session_id" *: *"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
count_file="${TMPDIR:-/tmp}/plateful-stop-hook-${sid:-nosession}"
n=$(cat "$count_file" 2>/dev/null || echo 0)
n=$((n + 1))
echo "$n" > "$count_file"

if [ "$n" -gt 3 ]; then
  echo "npm test still fails after 3 tries; letting the session stop. Last output:" >&2
  printf '%s\n' "$out" | tail -20 >&2
  exit 1
fi

echo "npm test failed (try $n of 3). Fix it, then finish. Output:" >&2
printf '%s\n' "$out" | tail -40 >&2
exit 2
