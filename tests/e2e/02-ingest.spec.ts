import { expect, test } from "@playwright/test";

const SOURCE = "e2e-api";

test("rejects requests with no api key", async ({ request }) => {
  const response = await request.post(`/api/logs/${SOURCE}`, {
    data: [{ message: "no auth" }],
  });

  expect(response.status()).toBe(401);
});

test("rejects requests with a bad api key", async ({ request }) => {
  const response = await request.post(`/api/logs/${SOURCE}`, {
    headers: {
      Authorization: "Bearer bad-key",
    },
    data: [{ message: "bad auth" }],
  });

  expect(response.status()).toBe(401);
});

test("accepts array payload and returns inserted count", async ({ request }) => {
  const apiKey = process.env.SLOGGER_TEST_API_KEY!;
  const payload = [
    { message: "alpha", timestamp: "2025-01-15T00:00:00.000Z", nested: { value: 1 } },
    "plain-string",
    42,
    { message: "beta", meta: { time: "2025-01-16T00:00:00.000Z" } },
  ];

  const response = await request.post(`/api/logs/${SOURCE}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    data: payload,
  });

  expect(response.status()).toBe(200);
  const body = (await response.json()) as { inserted: number };
  expect(body.inserted).toBe(payload.length);
});
