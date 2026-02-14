#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  echo ">>> tearing down..."
  docker compose -f docker-compose.yml -f docker-compose.test.yml \
    --project-name slogger-test down -v --remove-orphans 2>/dev/null || true
  rm -rf "$TEST_TMP_DIR"
}
trap cleanup EXIT

TEST_TMP_DIR=$(mktemp -d)
export SLOGGER_TEST_CONFIG_PATH="$TEST_TMP_DIR/config.json"

RAW_KEY=$(npx tsx scripts/generate-api-key.ts --name "e2e-test" --config "$SLOGGER_TEST_CONFIG_PATH")
export SLOGGER_TEST_API_KEY="$RAW_KEY"

docker compose -f docker-compose.yml -f docker-compose.test.yml \
  --project-name slogger-test up -d --build --wait

echo ">>> waiting for app to be ready..."
ready=0
for _ in $(seq 1 30); do
  if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo ">>> app is ready"
    ready=1
    break
  fi
  sleep 2
done

if [ "$ready" -ne 1 ]; then
  echo ">>> app failed readiness check within 60s"
  exit 1
fi

npx playwright install --with-deps
npx playwright test tests/e2e/

echo ">>> all tests passed"
