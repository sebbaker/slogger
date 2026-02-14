import { expect, test } from "@playwright/test";

test("shows auth gate when no key in storage", async ({ page }) => {
  await page.goto("/explorer");
  await expect(page.getByText("Slogger Explorer")).toBeVisible();
  await expect(page.getByPlaceholder("sk_live_...")).toBeVisible();
});

test("accepts api key and shows explorer", async ({ page }) => {
  const apiKey = process.env.SLOGGER_TEST_API_KEY!;

  await page.goto("/explorer");
  await page.getByPlaceholder("sk_live_...").fill(apiKey);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("button", { name: "Clear API Key" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Source" })).toBeVisible();
});
