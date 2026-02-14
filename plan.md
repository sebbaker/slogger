# Slogger - Development Plan

A logging service built with Next.js, Prisma, and PostgreSQL. Single API endpoint ingests logs, stores them in a partitioned table, and a lean frontend lets you explore them.

---

## Phase 0: Project Scaffolding & Tooling

### 0.1 Initialize Prisma

- Run `npx prisma init` to create `prisma/schema.prisma` and `.env`
- Configure the datasource for PostgreSQL (use `DATABASE_URL` env var)
- Use the `pg` adapter since it's already installed

### 0.2 Initialize shadcn/ui

- Run `npx shadcn@latest init` to set up shadcn
- Install needed components as we go: `table`, `input`, `button`, `checkbox`, `dialog`, `sheet`, `select`, `popover`, `calendar`, `badge`, `label`, `card`

### 0.3 Install Additional Dependencies

- `zod` - runtime validation (used instead of casting, per style guide)
- No hashing dependency needed - use Node `crypto.createHash('sha256')` for API key hashing
- `date-fns` - date formatting/manipulation
- `@playwright/test` - e2e testing (dev dep, includes Playwright test runner)
- `tsx` - run TypeScript scripts directly (used by `tests/e2e/run.sh`)

### 0.4 Create Folder Structure

```
src/
├── app/
│   ├── api/
│   │   └── logs/
│   │       ├── route.ts              # GET /api/logs (query logs, Bearer auth)
│   │       └── [source]/
│   │           └── route.ts          # POST /api/logs/:source
│   ├── explorer/
│   │   └── page.tsx                  # Logs explorer UI
│   ├── layout.tsx
│   ├── page.tsx                      # Redirect to /explorer or landing
│   ├── globals.css
│   └── favicon.ico
├── components/
│   ├── logs-explorer/
│   │   ├── logs-table.tsx            # Main table component
│   │   ├── log-detail-panel.tsx      # Side panel for viewing a single log
│   │   ├── source-filter.tsx         # Source selection checkboxes
│   │   ├── search-controls.tsx       # Search inputs (fulltext, jsonpath, time range)
│   │   ├── pagination-controls.tsx   # Limit/offset controls
│   │   └── auth-gate.tsx             # API key input gate
│   └── ui/                           # shadcn components go here
├── lib/
│   ├── db.ts                         # Prisma client singleton
│   ├── config.ts                     # Load & parse config.json
│   ├── auth.ts                       # API key hashing & verification
│   ├── time-extraction.ts            # Extract time from log JSON using config paths
│   └── partition-manager.ts          # Background partition management
├── instrumentation.ts                # Next.js instrumentation hook (starts partition manager)
scripts/
├── generate-api-key.ts               # Generate hashed API key, append to config
├── run-migrations.sh                 # Run prisma migrate deploy
tests/
├── e2e/
│   ├── 01-config.spec.ts             # API key script & config validation
│   ├── 02-ingest.spec.ts             # POST /api/logs/:source
│   ├── 03-query.spec.ts              # GET /api/logs
│   ├── 04-explorer.spec.ts           # Explorer UI (Playwright browser tests)
│   └── run.sh                        # Orchestration shell script
config.json                            # API keys + time extraction paths
docker-compose.yml
docker-compose.test.yml                # Test override (fresh volume, config bind)
Dockerfile
.dockerignore
```

### 0.5 Create `.dockerignore`

- Ignore `node_modules`, `.next`, `.git`, `tests/`, etc.

### 0.6 next.config.ts Updates

- Add `output: 'standalone'`
- Add `serverExternalPackages: ['pg']` if needed

---

## Phase 1: Docker, Docker Compose & E2E Test Harness

> **Philosophy:** Build the deployment container and test harness first. Every subsequent
> phase is developed _against_ the e2e test — run `tests/e2e/run.sh` after each phase
> to see what passes and what's still left. The test starts red, and we make it green
> phase by phase.

### 1.1 Dockerfile

Multi-stage build:

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Entrypoint script runs migrations then starts server
COPY scripts/run-migrations.sh ./
RUN chmod +x run-migrations.sh
CMD ["sh", "-c", "./run-migrations.sh && node server.js"]
```

**Note:** Must enable `output: 'standalone'` in `next.config.ts` for the standalone build.

### 1.2 docker-compose.yml (production)

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: slogger
      POSTGRES_PASSWORD: slogger
      POSTGRES_DB: slogger
    volumes:
      - pgdata:/var/lib/postgresql/data
    # ports:
    #   - "5432:5432"   # uncomment to connect externally / run migrations
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U slogger"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://slogger:slogger@db:5432/slogger
      CONFIG_PATH: /app/config.json
    volumes:
      - ./config.json:/app/config.json:ro
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
```

### 1.3 docker-compose.test.yml (test override)

A compose override file used _only_ by the e2e test runner. Layered on top of the base
file with `docker compose -f docker-compose.yml -f docker-compose.test.yml up`.

```yaml
services:
  db:
    volumes:
      - slogger_test_pgdata:/var/lib/postgresql/data # isolated test volume

  app:
    environment:
      CONFIG_PATH: /app/config.json
    volumes:
      - ${SLOGGER_TEST_CONFIG_PATH:?}:/app/config.json:ro # bind the temp test config

volumes:
  slogger_test_pgdata: # fresh volume, torn down after
```

### 1.4 Migration Script (`scripts/run-migrations.sh`)

```bash
#!/bin/sh
node ./node_modules/prisma/build/index.js migrate deploy
```

### 1.5 End-to-End Test Script (`tests/e2e/run.sh`)

Orchestration shell script — the single command to validate the entire system:

```bash
#!/usr/bin/env bash
set -euo pipefail

# --- cleanup on exit, pass or fail ---
cleanup() {
  echo ">>> tearing down..."
  docker compose -f docker-compose.yml -f docker-compose.test.yml \
    --project-name slogger-test down -v --remove-orphans 2>/dev/null || true
  rm -rf "$TEST_TMP_DIR"
}
trap cleanup EXIT

# 1. create temp config directory
TEST_TMP_DIR=$(mktemp -d)
export SLOGGER_TEST_CONFIG_PATH="$TEST_TMP_DIR/config.json"

# 2. generate an api key into the temp config
RAW_KEY=$(npx tsx scripts/generate-api-key.ts --name "e2e-test" --config "$SLOGGER_TEST_CONFIG_PATH")
export SLOGGER_TEST_API_KEY="$RAW_KEY"

# 3. build & start
docker compose -f docker-compose.yml -f docker-compose.test.yml \
  --project-name slogger-test up -d --build --wait

# 4. wait for healthy (poll /api/health or just the homepage)
echo ">>> waiting for app to be ready..."
ready=0
for i in $(seq 1 30); do
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

# ensure browser binaries/deps exist for local Playwright runner
npx playwright install --with-deps

# 5. run playwright tests (numbered prefixes ensure sequential order)
npx playwright test tests/e2e/

echo ">>> all tests passed"
```

### 1.6 End-to-End Test Files

Tests are split into numbered files so Playwright runs them sequentially (later files depend on data inserted by earlier ones). The API tests use plain `fetch()` calls; only `04-explorer` uses browser automation.

**`01-config.spec.ts`** — Config & API key script

```
✓ config file was created by run.sh
✓ config contains the generated api key hash
```

**`02-ingest.spec.ts`** — POST /api/logs/:source

```
✓ rejects requests with no api key (401)
✓ rejects requests with a bad api key (401)
✓ accepts an array of objects and returns inserted count
✓ accepts an array of mixed types (strings, numbers, nested objects, arrays)
✓ extracts time from objects using configured time_paths
✓ uses server time when no time_path matches
```

**`03-query.spec.ts`** — GET /api/logs

```
✓ rejects requests with no auth (401)
✓ authenticates via Bearer token
✓ returns all logs when no filters applied
✓ filters by source
✓ full-text search finds logs containing a unique string
✓ jsonb_path_exists finds logs matching a json path
✓ time range filtering works
✓ limit and offset pagination works
✓ returns distinct sources list
```

**`04-explorer.spec.ts`** — Explorer UI (Playwright browser tests)

```
✓ shows auth gate when no API key is stored in browser state
✓ entering a valid api key stores it in browser state and shows explorer
✓ logs table displays inserted logs
✓ source checkboxes filter the table
✓ full-text search filters the table
✓ clicking a row opens the detail side panel with formatted JSON
✓ pagination controls work (limit, next, previous)
```

Playwright config should set `fullyParallel: false` and `workers: 1` to ensure sequential execution (package: `@playwright/test`).

---

## Phase 2: Config File & API Key Script

### 2.1 Define Config Schema (`src/lib/config.ts`)

Config file lives at `config.json` (or path from `CONFIG_PATH` env var). Shape:

```typescript
type SloggerConfig = {
  /* named API keys - name is just for identification, hash is what we verify against */
  api_keys: Array<{
    name: string;
    hash: string; /* sha256 hex digest of the raw key */
  }>;

  /*
   * json paths to try when extracting a timestamp from incoming log objects.
   * tried in order, first match wins. e.g. ["timestamp", "time", "created_at", "meta.time"]
   * if none match, current server time is used.
   */
  time_paths: string[];
};
```

- Load config once at startup, watch for changes or reload on each request (simple approach: reload each request since it's a small file)
- Validate with zod

### 2.2 Auth Module (`src/lib/auth.ts`)

- `hashKey(raw: string): string` — `crypto.createHash('sha256')` hex digest
- `getAuthKey(request: Request): string | null` — extracts raw API key from the `Authorization: Bearer <key>` header. Returns `null` if header is missing or malformed.
- `verifyRequest(request: Request): boolean` — calls `getAuthKey`, hashes it, compares against config. Single function both route handlers call.

### 2.3 Generate API Key Script (`scripts/generate-api-key.ts`)

- Run with: `npx tsx scripts/generate-api-key.ts --name "my-service" --config ./config.json`
- Generates a random key using `crypto.randomBytes(32).toString('hex')`
- Hashes it with sha256
- Appends `{ name, hash }` to the config file's `api_keys` array
- Creates the config file if it doesn't exist (with empty `api_keys` and default `time_paths`)
- Prints the raw key to stdout (user must save it, it can't be recovered)

**E2E checkpoint:** After this phase, `tests/e2e/run.sh` should get past the setup steps
(config created, key generated, docker compose builds successfully). The API key script
tests in the e2e spec should pass.

---

## Phase 3: Database Schema & Migrations

### 3.1 Prisma Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

model Log {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  source     String
  props      Json
  time       DateTime
  created_at DateTime @default(now())

  @@index([source])
  @@index([time])
  @@map("logs")
}
```

### 3.2 Initial Migration (with manual edits)

**Steps:**

1. `npx prisma migrate dev --name initial --create-only` - creates SQL file without applying
2. Edit the generated migration SQL to add:
   - The `search_text` generated column:
     ```sql
     ALTER TABLE "logs"
     ADD COLUMN "search_text" text
     GENERATED ALWAYS AS ("props"::text) STORED;
     ```
   - The GIN full-text search index:
     ```sql
     CREATE INDEX "logs_search_text_fts"
     ON "logs"
     USING gin (to_tsvector('simple', "search_text"));
     ```
   - Partition setup for the `logs` table - **IMPORTANT**: Prisma doesn't support partitioned tables natively. We need to:
     - Change the `CREATE TABLE` to `CREATE TABLE "logs" (...) PARTITION BY RANGE ("time")`
     - The initial migration creates the partitioned parent table
     - Actual partitions are created by the background process
3. `npx prisma migrate dev` - apply the edited migration

**Critical Prisma notes:**

- Prisma doesn't understand partitioned tables - the schema.prisma models the logical table, the migration SQL handles the physical partitioning
- The `search_text` column is NOT in the Prisma schema (it's a generated column managed by Postgres directly)
- After editing migration SQL, run `npx prisma generate` to regenerate the client
- Prisma introspection may complain about the partitioned table - this is fine, we only use `migrate deploy` in production

### 3.3 Partition Manager (`src/lib/partition-manager.ts`)

Background process that:

1. Runs on a configurable interval (e.g. every hour, checked daily)
2. Checks if partitions exist for today + next 7 days
3. Creates missing partitions as: `logs_YYYY_MM_DD` covering `[date, date + 1 day)`
4. Optionally: detach/drop partitions older than a configurable retention period

Partition creation SQL:

```sql
CREATE TABLE IF NOT EXISTS logs_2025_01_15
PARTITION OF logs
FOR VALUES FROM ('2025-01-15') TO ('2025-01-16');
```

**Note on partitioned tables and Prisma:**

- Prisma's `migrate deploy` will create the parent partitioned table
- The partition manager creates child partitions at runtime
- Inserts to the parent table automatically route to the correct partition
- If no partition exists for the insert's time range, Postgres will error - hence we pre-create partitions

### 3.4 Instrumentation Hook (`src/instrumentation.ts`)

Next.js instrumentation hook that:

- Starts the partition manager on server startup
- Ensures initial partitions exist (today + 7 days ahead)
- Sets up an interval to check/create partitions periodically (every 6 hours)
- Only runs on the server (not edge, not client)

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensurePartitions } = await import("./lib/partition-manager");
    await ensurePartitions();
    setInterval(() => ensurePartitions(), 6 * 60 * 60 * 1000);
  }
}
```

**E2E checkpoint:** After this phase, docker compose should start cleanly with migrations
applied, partitions created, and the app responding. The server starts without errors.

---

## Phase 4: API Endpoints

### 4.1 POST `/api/logs/[source]` (`src/app/api/logs/[source]/route.ts`)

**Request:**

- Method: `POST`
- URL: `/api/logs/:source` (source is the log group name)
- Headers: `Authorization: Bearer <api-key>`
- Body: JSON array of log entries (each entry can be any JSON value - string, number, object, array, null, boolean)

**Processing:**

1. Validate `Authorization` header - hash the provided key, check against config
2. Parse request body with zod: `z.array(z.unknown())`
3. For each entry in the array:
   - If the entry is an object, attempt to extract time using `time_paths` from config
   - If no time extracted or entry is not an object, use `new Date()` (current server time)
   - Wrap non-object values: primitives become `{ "value": <primitive> }` so they're valid JSONB
4. Batch insert all logs into the `logs` table with `prisma.log.createMany()`
5. Return `{ inserted: count }`

**Response:**

- `200`: `{ "inserted": number }`
- `401`: `{ "error": "unauthorized" }`
- `400`: `{ "error": "body must be a json array" }`

### 4.2 GET `/api/logs` (`src/app/api/logs/route.ts`)

**Request:**

- Method: `GET`
- Auth:
  - Header: `Authorization: Bearer <api-key>` (required)
- Query params:
  - `sources` - comma-separated source names (or empty for all)
  - `search` - full-text search query (use `plainto_tsquery`, not raw `to_tsquery`)
  - `json_path` - jsonb path expression for `jsonb_path_exists`
  - `from` - start time (ISO string)
  - `to` - end time (ISO string)
  - `limit` - max results (default 100, max 1000)
  - `offset` - pagination offset (default 0)

**Processing:**

1. Validate API key from `Authorization: Bearer <api-key>` header against config
2. Build a raw SQL query (since Prisma doesn't support full-text search or jsonb_path_exists natively):
   ```sql
   SELECT id, source, props, time, created_at
   FROM logs
   WHERE 1=1
     AND (source = ANY($sources) OR $sources IS NULL)
     AND (
       $search IS NULL
       OR to_tsvector('simple', search_text) @@ plainto_tsquery('simple', $search)
     )
     AND ($json_path IS NULL OR jsonb_path_exists(props, $json_path::jsonpath))
     AND ($from IS NULL OR time >= $from)
     AND ($to IS NULL OR time <= $to)
   ORDER BY time DESC
   LIMIT $limit OFFSET $offset
   ```
3. Also return a `total` count (separate count query, same filters)
4. Return list of sources for the filter UI (separate query: `SELECT DISTINCT source FROM logs`)

**Response:**

- `200`: `{ "logs": Log[], "total": number, "sources": string[] }`
- `401`: `{ "error": "unauthorized" }`

**E2E checkpoint:** After this phase, all POST and GET `/api/logs` tests in the e2e spec should
pass. `run.sh` successfully inserts logs, queries them back, and verifies correctness.

---

## Phase 5: Explorer Frontend

### 5.1 Auth Gate (`src/components/logs-explorer/auth-gate.tsx`)

- Full-page centered card with a single input for the API key
- On submit: store API key in browser state (for example `localStorage`) and load explorer
- Client requests to `/api/logs` include `Authorization: Bearer <key>`

### 5.2 Explorer Page (`src/app/explorer/page.tsx`)

- Check for API key in browser state (client-side)
- If missing: show `AuthGate`
- If present: call `/api/logs`; on `401`, clear key and show `AuthGate`

### 5.3 Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Source Filter]  [Fulltext] [JSONPath] [Time Range]    │ Logs Explorer
│  [□ All] [□ src1] [□ src2]  [_______] [________]       │
│  [Limit: 100] [Offset: 0] [Search]                     │
├─────────────────────────────────────────────────────────┤
│  Time        │ Source  │ Preview                        │
│──────────────┼─────────┼────────────────────────────────│
│  2025-01-15  │ api     │ { "method": "GET", "path":... │
│  2025-01-15  │ api     │ { "status": 200, "duratio...  │
│  2025-01-15  │ worker  │ { "job": "send_email", "t...  │
│  ...         │ ...     │ ...                            │
├─────────────────────────────────────────────────────────┤
│                                          Page 1 of 10   │
└─────────────────────────────────────────────────────────┘
```

When a row is clicked, a `Sheet` (shadcn) slides in from the right showing:

- Full JSON formatted with syntax highlighting (or just `<pre>` with `JSON.stringify(props, null, 2)`)
- Source, time, created_at metadata

### 5.4 Components Breakdown

**`logs-table.tsx`**

- Uses shadcn `Table` component
- Columns: Time, Source, Preview (truncated JSON)
- Rows are clickable, highlight on hover
- Table stretches to fill remaining vertical space (`flex-1 overflow-auto`)

**`log-detail-panel.tsx`**

- shadcn `Sheet` component, opens from right side
- Shows formatted JSON of the selected log
- Shows metadata (source, time, created_at, id)

**`source-filter.tsx`**

- List of checkboxes for each source
- "Select All" checkbox at the top
- Sources fetched from the GET endpoint

**`search-controls.tsx`**

- Fulltext search: `Input` with placeholder "Full-text search..."
- JSONPath search: `Input` with placeholder "JSONPath expression..."
- Time range: Two date/time pickers (from, to) - use shadcn `Popover` + `Calendar` or simple datetime-local inputs
- Limit: `Input` type number, default 100
- Offset: `Input` type number, default 0
- Search button to trigger fetch

**`pagination-controls.tsx`**

- Previous / Next buttons
- Current page indicator
- Updates offset based on limit

**E2E checkpoint:** After this phase, all Playwright UI tests should pass. The full
`tests/e2e/run.sh` goes green — the entire system is verified end to end.

---

## Implementation Order

The build order follows the test-first philosophy — infrastructure and tests are
built before the features they validate:

| Step | Task                                                                                 | Depends On | E2E Tests That Should Pass                     |
| ---- | ------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------- |
| 1    | Phase 0: Scaffolding (prisma init, shadcn init, deps, folder structure, next.config) | Nothing    | None (setup only)                              |
| 2    | **Phase 1: Dockerfile + docker-compose + e2e test harness**                          | Step 1     | None yet (test script runs, app may not build) |
| 3    | Phase 2: Config file + API key script                                                | Step 1     | `api key script` tests                         |
| 4    | Phase 3: Database schema + migrations + partition manager + instrumentation          | Steps 1-3  | Docker builds & starts cleanly                 |
| 5    | Phase 4.1: POST `/api/logs/[source]` endpoint                                        | Steps 3, 4 | `POST /api/logs` tests                         |
| 6    | Phase 4.2: GET `/api/logs` endpoint                                                  | Steps 3, 4 | `GET /api/logs` tests                          |
| 7    | Phase 5: Explorer frontend (auth gate, table, filters, detail panel)                 | Step 6     | `explorer UI` Playwright tests                 |

**Total estimated files to create/modify:** ~25-30 files

---

## Key Technical Decisions

1. **API key hashing**: SHA-256 via built-in Node `crypto.createHash` (no salt needed - keys are high entropy random values, not passwords). Simple, no native dependencies for Docker.

2. **Partitioning strategy**: Daily partitions created ahead of time by background process. Parent table is `PARTITION BY RANGE (time)`. Partition manager runs on startup via Next.js instrumentation hook and then every 6 hours.

3. **Raw SQL for queries**: The GET endpoint uses `prisma.$queryRawUnsafe` (with parameterized queries for safety) because Prisma doesn't support full-text search with `to_tsvector` + tsquery functions or `jsonb_path_exists`. Use `plainto_tsquery` for user-entered search text; avoid passing raw UI input to `to_tsquery`. All user inputs are parameterized, never interpolated.

4. **Prisma migration strategy**: Create migrations with `--create-only`, manually edit SQL for partitioning and generated columns, then apply. This keeps Prisma's migration history intact while allowing Postgres-specific features.

5. **Non-object log values**: Primitives (string, number, boolean, null) and arrays are wrapped in `{ "value": <original> }` before storage so they're valid JSONB objects. The original value type is preserved in the JSON.

6. **Config reloading**: Config is re-read from disk on each request (it's tiny, ~1KB). No need for a file watcher or restart. This means you can add API keys without restarting the server.

7. **Auth for GET `/api/logs`**: Bearer-token only via `Authorization: Bearer <key>`. The explorer frontend stores the key client-side and includes the header on each request; programmatic clients do the same. No sessions, no JWTs, no complexity.
