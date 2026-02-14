import { expect, test } from "@playwright/test";

const SOURCE = "e2e-api";

test("rejects requests with no auth", async ({ request }) => {
  const response = await request.get("/api/logs");
  expect(response.status()).toBe(401);
});

test("authenticates via bearer token", async ({ request }) => {
  const apiKey = process.env.SLOGGER_TEST_API_KEY!;
  const response = await request.get("/api/logs", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    logs: Array<unknown>;
    total: number;
  };

  expect(body.total).toBeGreaterThan(0);
  expect(Array.isArray(body.logs)).toBeTruthy();
});

test("lists sources from dedicated endpoint", async ({ request }) => {
  const apiKey = process.env.SLOGGER_TEST_API_KEY!;
  const response = await request.get("/api/sources", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    sources: string[];
  };

  expect(body.sources).toContain(SOURCE);
});

test("supports filters and pagination", async ({ request }) => {
  const apiKey = process.env.SLOGGER_TEST_API_KEY!;
  const response = await request.get(
    `/api/logs?sources=${SOURCE}&search=alpha&json_path=$.nested.value%20?%20(@%20==%201)&limit=1&offset=0`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    logs: Array<{ source: string }>;
    total: number;
  };

  expect(body.logs.length).toBeLessThanOrEqual(1);
  expect(body.total).toBeGreaterThanOrEqual(1);
  expect(body.logs[0]?.source).toBe(SOURCE);
});
