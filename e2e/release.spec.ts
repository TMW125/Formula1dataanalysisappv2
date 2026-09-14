import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { installOpenF1Fixtures } from "./fixtures";

const selection = "";

test("unsupported viewports do not start OpenF1 requests", async ({ page }) => {
  await page.setViewportSize({ width: 1023, height: 768 });
  const tracker = await installOpenF1Fixtures(page);
  await page.goto(`/qualifying${selection}`);

  await expect(page.getByRole("heading", { name: "A larger screen is required" })).toBeVisible();
  expect(tracker.openF1Urls).toEqual([]);
});

test("the direct Practice placeholder is static and non-fetching", async ({ page }) => {
  const tracker = await installOpenF1Fixtures(page);
  await page.goto(`/practice${selection}`);

  await expect(page.getByRole("heading", { name: "Practice analysis" })).toBeVisible();
  await expect(page.getByText("Coming soon", { exact: true }).first()).toBeVisible();
  expect(tracker.openF1Urls).toEqual([]);
});

for (const [path, heading] of [
  ["/", "Dashboard"],
  ["/qualifying", "Qualifying"],
  ["/race", "Race"],
  ["/live-replay", "Race"],
  ["/not-a-route", "Page not found"],
] as const) {
  test(`hard refresh loads ${path}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await installOpenF1Fixtures(page);
    await page.goto(`${path}${selection}`);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({ timeout: 20_000 });
    consoleErrors.length = 0;
    await page.reload();

    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({ timeout: 20_000 });
    expect(consoleErrors).toEqual([]);
  });
}

test("meeting choices omit dates and selection does not change the URL", async ({ page }) => {
  await installOpenF1Fixtures(page);
  await page.goto(`/${selection}`);
  const selector = page.getByRole("combobox", { name: "Select race weekend" });
  await expect(selector).toBeEnabled();

  const labels = await selector.locator("option").allTextContents();
  expect(labels.some((label) => label.includes("Barcelona"))).toBe(true);
  expect(labels.some((label) => label.includes("Bahrain"))).toBe(true);
  expect(labels.some((label) => /\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/.test(label))).toBe(false);
  expect(new Set(labels.slice(1)).size).toBe(labels.length - 1);
  await selector.selectOption("1289");
  await expect(selector).toHaveValue("1289");
  await expect(page).toHaveURL(/\/$/);
});

test("Dashboard, Qualifying, and Race remain horizontally contained at 1024px", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await installOpenF1Fixtures(page);

  for (const [path, heading] of [["/", "Dashboard"], ["/qualifying", "Qualifying"], ["/race", "Race"]] as const) {
    await page.goto(`${path}${selection}`);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({ timeout: 20_000 });
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflows, `${path} should not overflow horizontally at 1024px`).toBe(false);
  }
});

test("all qualifying telemetry requests remain bounded to fastest laps", async ({ page }) => {
  const tracker = await installOpenF1Fixtures(page);
  await page.goto(`/qualifying${selection}`);
  await expect(page.getByRole("button", { name: /selected/ })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Select all" }).click();

  await expect.poll(() => tracker.openF1Urls.filter((url) => url.includes("/car_data")).length, { timeout: 30_000 }).toBe(22);
  const telemetryUrls = tracker.openF1Urls.filter((url) => url.includes("/car_data"));
  expect(telemetryUrls.every((url) => {
    const decodedUrl = decodeURIComponent(url);
    return /[?&]date>=\d{4}-/.test(decodedUrl) && /[?&]date<\d{4}-/.test(decodedUrl);
  })).toBe(true);

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByText("No drivers selected.", { exact: false })).toBeVisible();
});

test("replay controls follow the visualization and precede the feed", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await installOpenF1Fixtures(page);
  await page.goto(`/live-replay${selection}`);
  const controls = page.getByRole("region", { name: "Replay controls" });
  const circuit = page.getByRole("region", { name: "Circuit replay" });
  const classification = page.getByRole("region", { name: "Classification" });
  const feed = page.getByRole("region", { name: "Replay feed" });
  await expect(controls).toBeVisible({ timeout: 20_000 });
  await expect(circuit).toBeVisible();

  const controlsBox = await controls.boundingBox();
  const circuitBox = await circuit.boundingBox();
  const classificationBox = await classification.boundingBox();
  const feedBox = await feed.boundingBox();
  expect(controlsBox).not.toBeNull();
  expect(circuitBox).not.toBeNull();
  expect(classificationBox).not.toBeNull();
  expect(feedBox).not.toBeNull();
  expect(controlsBox!.y).toBeGreaterThanOrEqual(circuitBox!.y + circuitBox!.height);
  expect(controlsBox!.y).toBeGreaterThanOrEqual(classificationBox!.y + classificationBox!.height);
  expect(controlsBox!.y + controlsBox!.height).toBeLessThanOrEqual(feedBox!.y);
});

test("critical structural accessibility checks pass", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Axe structural checks run once in Chromium; interaction coverage runs in every engine.");
  await installOpenF1Fixtures(page);
  await page.goto(`/qualifying${selection}`);
  await expect(page.getByRole("button", { name: /selected/ })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /selected/ }).click();

  const results = await new AxeBuilder({ page }).analyze();
  const seriousViolations = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  expect(seriousViolations).toEqual([]);
});

test("a 404 meeting failure is distinct and can be retried", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Failure-state semantics run once in Chromium.");
  await installOpenF1Fixtures(page, { endpointFailures: { meetings: { status: 404, times: 1 } } });
  await page.goto(`/${selection}`);

  const alert = page.getByRole("alert");
  await expect(alert.getByRole("heading", { name: "Race weekends could not be loaded" })).toBeVisible();
  await expect(alert).toContainText("404");
  await alert.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 20_000 });
});

test("429 responses surface as rate-limit failures", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Failure-state semantics run once in Chromium.");
  await installOpenF1Fixtures(page, { endpointFailures: { meetings: { status: 429 } } });
  await page.goto(`/${selection}`);

  const alert = page.getByRole("alert");
  await expect(alert.getByRole("heading", { name: "Race weekends could not be loaded" })).toBeVisible({ timeout: 20_000 });
  await expect(alert).toContainText("429");
  await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("required endpoint 500 errors block analysis with retry", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Failure-state semantics run once in Chromium.");
  await installOpenF1Fixtures(page, { endpointFailures: { drivers: { status: 500 } } });
  await page.goto(`/qualifying${selection}`);

  const alert = page.getByRole("alert");
  await expect(alert.getByRole("heading", { name: "Qualifying data could not be loaded" })).toBeVisible({ timeout: 20_000 });
  await expect(alert).toContainText("500");
  await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("offline session requests produce a recoverable shell error", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Failure-state semantics run once in Chromium.");
  await installOpenF1Fixtures(page, { abortEndpoints: ["sessions"] });
  await page.goto(`/${selection}`);

  const alert = page.getByRole("alert");
  await expect(alert.getByRole("heading", { name: "Weekend sessions could not be loaded" })).toBeVisible({ timeout: 20_000 });
  await expect(alert).toContainText(/Failed to fetch|NetworkError|Load failed/i);
  await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("malformed scheduling is not mistaken for missing analysis", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Failure-state semantics run once in Chromium.");
  await installOpenF1Fixtures(page, { malformedSessions: true });
  await page.goto(`/qualifying${selection}`);

  await expect(page.getByRole("heading", { name: "Qualifying unavailable" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("This session has invalid scheduling information.")).toBeVisible();
});

test("empty required data renders an explicit empty state", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Failure-state semantics run once in Chromium.");
  await installOpenF1Fixtures(page, { emptyEndpoints: ["drivers"] });
  await page.goto(`/qualifying${selection}`);

  await expect(page.getByRole("heading", { name: "No qualifying lap data" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/returned no drivers, completed laps, or final classification/)).toBeVisible();
});

test("clearing selection cancels queued all-driver telemetry", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Cancellation semantics run once in Chromium.");
  const tracker = await installOpenF1Fixtures(page, { delayMsByEndpoint: { car_data: 2_000 } });
  await page.goto(`/qualifying${selection}`);
  await expect(page.getByRole("button", { name: /selected/ })).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "Select all" }).click();
  await expect(page.getByText(/Loading fastest-lap telemetry:/)).toBeVisible();
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByText("No drivers selected.", { exact: false })).toBeVisible();
  await page.waitForTimeout(2_500);
  expect(tracker.openF1Urls.filter((url) => url.includes("/car_data")).length).toBeLessThan(22);
});
