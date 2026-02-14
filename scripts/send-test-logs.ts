type Args = {
  apiKey: string;
  baseUrl: string;
  source: string;
  count: number;
};

function parseArgs(argv: string[]): Args {
  let apiKey = process.env.TEST_SLOGGER_API_KEY ?? "";
  let baseUrl = process.env.TEST_SLOGGER_BASE_URL ?? "http://localhost:3000";
  let source = "test-data";
  let count = 25;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--api-key") {
      apiKey = argv[i + 1] ?? apiKey;
      i += 1;
      continue;
    }

    if (arg === "--base-url") {
      baseUrl = argv[i + 1] ?? baseUrl;
      i += 1;
      continue;
    }

    if (arg === "--source") {
      source = argv[i + 1] ?? source;
      i += 1;
      continue;
    }

    if (arg === "--count") {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        count = Math.floor(parsed);
      }
      i += 1;
    }
  }

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/$/, ""),
    source,
    count,
  };
}

function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTimestamp(): string {
  const now = Date.now();
  const lookbackMs = 1000 * 60 * 60 * 24 * 7;
  const offset = Math.floor(Math.random() * lookbackMs);
  return new Date(now - offset).toISOString();
}

function buildPayload(count: number): Array<Record<string, unknown>> {
  const levels = ["debug", "info", "warn", "error"] as const;
  const routes = ["/", "/api/logs", "/login", "/checkout", "/healthz"];
  const actions = ["page_view", "button_click", "payment_attempt", "job_run", "auth_check"];

  return Array.from({ length: count }, (_, idx) => ({
    event_id: `evt_${Date.now()}_${idx}_${randomInt(1000, 9999)}`,
    timestamp: randomTimestamp(),
    level: randomChoice([...levels]),
    action: randomChoice(actions),
    route: randomChoice(routes),
    duration_ms: randomInt(10, 1500),
    status_code: randomChoice([200, 200, 200, 201, 400, 401, 404, 500]),
    message: `Synthetic log event ${idx + 1}`,
    user_id: `user_${randomInt(1, 100)}`,
    meta: {
      region: randomChoice(["us-east-1", "us-west-2", "eu-west-1"]),
      release: `2026.${randomInt(1, 12)}.${randomInt(0, 30)}`,
    },
  }));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.apiKey) {
    process.stderr.write(
      "Missing API key. Pass --api-key <key> or set TEST_SLOGGER_API_KEY.\n",
    );
    process.exit(1);
  }

  const payload = buildPayload(args.count);
  const response = await fetch(`${args.baseUrl}/api/logs/${encodeURIComponent(args.source)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    process.stderr.write(`Request failed (${response.status}): ${text}\n`);
    process.exit(1);
  }

  process.stdout.write(`Sent ${payload.length} logs to ${args.source}\n`);
  process.stdout.write(`${text}\n`);
}

void main();
