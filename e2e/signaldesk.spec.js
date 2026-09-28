import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("captures, finds, edits, and removes a signal with undo", async ({ page }) => {
  await page.getByLabel("Title", { exact: true }).fill("Caching decisions");
  await page.getByLabel("Note").fill("Keep stale data visible while refresh retries in the background.");
  await page.getByLabel("Type").selectOption("idea");
  await page.getByRole("textbox", { name: "Tags", exact: true }).fill("architecture, reliability");
  await page.getByRole("button", { name: "Add to SignalDesk" }).click();

  await page.getByPlaceholder("Search title, note, tag…").fill("reliability");
  const card = page.getByRole("article").filter({ hasText: "Caching decisions" });
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Caching and stale-data decisions");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Caching and stale-data decisions")).toBeVisible();

  const updatedCard = page
    .getByRole("article")
    .filter({ hasText: "Caching and stale-data decisions" });
  await updatedCard.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(/removed/)).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Caching and stale-data decisions")).toBeVisible();
});

test("persists created signals across a reload", async ({ page }) => {
  await page.getByLabel("Title", { exact: true }).fill("Persistent signal");
  await page.getByLabel("Note").fill("This survives a full document reload.");
  await page.getByRole("button", { name: "Add to SignalDesk" }).click();

  await page.reload();

  await expect(page.getByText("Persistent signal")).toBeVisible();
  await expect(page.getByText("This survives a full document reload.")).toBeVisible();
});

test("filters pinned and favorite signals without mutating the library", async ({ page }) => {
  await page.getByRole("button", { name: /^Pinned/ }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByText("Product decisions worth revisiting")).toBeVisible();

  await page.getByRole("button", { name: /^Favorites/ }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(page.getByText("Small ideas compound")).toBeVisible();

  await page.getByRole("button", { name: /^All/ }).click();
  await expect(page.getByRole("article")).toHaveCount(3);
});

test("recovers safely from corrupted persisted data", async ({ page }) => {
  await page.evaluate(() => {
    window.localStorage.setItem("signaldesk:posts", "{not valid json");
  });

  await page.reload();

  await expect(page.getByText("Product decisions worth revisiting")).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(3);
});

test("keeps an intentionally empty library empty across reloads", async ({ page }) => {
  await page.evaluate(() => {
    window.localStorage.setItem(
      "signaldesk:posts",
      JSON.stringify({ version: 1, posts: [] }),
    );
  });

  await page.reload();
  await expect(page.getByText("Your workspace is clear")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Your workspace is clear")).toBeVisible();
});

test("exports and restores a validated backup", async ({ page }) => {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();

  expect(download.suggestedFilename()).toMatch(/^signaldesk-backup-\d{4}-\d{2}-\d{2}\.json$/);
  expect(downloadPath).toBeTruthy();

  const exported = JSON.parse(await readFile(downloadPath, "utf8"));
  expect(exported).toMatchObject({
    app: "signaldesk",
    version: 1,
  });
  expect(exported.posts).toHaveLength(3);

  await page.evaluate(() => {
    window.localStorage.setItem(
      "signaldesk:posts",
      JSON.stringify({ version: 1, posts: [] }),
    );
  });
  await page.reload();
  await expect(page.getByText("Your workspace is clear")).toBeVisible();

  await page.getByLabel("Restore SignalDesk backup").setInputFiles(downloadPath);
  await expect(page.getByText("Ready to restore 3 signals")).toBeVisible();
  await page.getByRole("button", { name: "Restore now" }).click();

  await expect(page.getByRole("article")).toHaveCount(3);
  await page.reload();
  await expect(page.getByRole("article")).toHaveCount(3);
});

test("supports keyboard-first capture and search", async ({ page }) => {
  await page.keyboard.press("n");
  await expect(page.getByLabel("Title", { exact: true })).toBeFocused();

  await page.getByLabel("Title", { exact: true }).press("Escape");
  await page.locator("body").click({ position: { x: 4, y: 4 } });
  await page.keyboard.press("/");
  await expect(page.getByPlaceholder("Search title, note, tag…")).toBeFocused();
});

test("has no obvious automated accessibility violations", async ({ page }) => {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("does not overflow horizontally on the tested viewport", async ({ page }) => {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
});


test("keeps bridge audio opt-in and switches between original sound modes", async ({ page }) => {
  const audioConsole = page.locator(".audio-console");
  await expect(audioConsole).toHaveAttribute("data-mode", "off");

  await audioConsole.locator("summary").click();

  const ambient = page.getByRole("button", { name: "Ambient", exact: true });
  const cinematic = page.getByRole("button", { name: "Cinematic", exact: true });
  const off = page.getByRole("button", { name: "Off", exact: true });

  await ambient.click();
  await expect(audioConsole).toHaveAttribute("data-mode", "ambient");
  await expect(ambient).toHaveAttribute("aria-pressed", "true");

  await cinematic.click();
  await expect(audioConsole).toHaveAttribute("data-mode", "cinematic");
  await expect(cinematic).toHaveAttribute("aria-pressed", "true");

  await off.click();
  await expect(audioConsole).toHaveAttribute("data-mode", "off");
  await expect(off).toHaveAttribute("aria-pressed", "true");
});
