import fs from "node:fs";
import { expect, test } from "@playwright/test";

test("config file was created by run.sh", () => {
  const configPath = process.env.SLOGGER_TEST_CONFIG_PATH;
  expect(configPath).toBeTruthy();
  expect(fs.existsSync(configPath!)).toBeTruthy();
});

test("config contains generated api key hash", () => {
  const configPath = process.env.SLOGGER_TEST_CONFIG_PATH!;
  const raw = fs.readFileSync(configPath, "utf-8");
  const config = JSON.parse(raw) as {
    api_keys: Array<{ name: string; hash: string }>;
  };

  expect(config.api_keys.length).toBeGreaterThan(0);
  expect(config.api_keys[0].hash).toMatch(/^[a-f0-9]{64}$/i);
});
