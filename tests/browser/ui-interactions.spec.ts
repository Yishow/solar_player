import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Route } from "playwright";
import { apiJson, expect, test } from "./fixtures/runtime";

const browserErrors: string[] = [];
test.beforeEach(async ({ page }) => {
  browserErrors.length = 0;
  await page.setViewportSize({ width: 1920, height: 1080 });
  page.on("pageerror", (error) => browserErrors.push(error.message));
});
test.afterEach(async ({ page, runtime }, testInfo) => {
  const screenshot = path.join(runtime.artifactDir, `${testInfo.title.replace(/[^a-z0-9]+/gi, "-")}.png`);
  if (page.url() !== "about:blank") {
    await page.screenshot({ path: screenshot });
    await testInfo.attach("interaction-state", { path: screenshot, contentType: "image/png" });
  }
  const resultPath = path.join(runtime.artifactDir, "ui-interactions-results.json");
  const results = existsSync(resultPath) ? JSON.parse(readFileSync(resultPath, "utf8")) : [];
  results.push({ title: testInfo.title, status: browserErrors.length ? "failed" : testInfo.status, pageErrors: [...browserErrors], screenshot: page.url() === "about:blank" ? null : screenshot, runId: runtime.runId, baseUrl: runtime.baseUrl, mqttDataMode: runtime.mqttDataMode });
  writeFileSync(resultPath, JSON.stringify(results, null, 2));
  expect(browserErrors).toEqual([]);
});

test("ui-interactions select keyboard commits once and dismisses without changing value", async ({ page }) => {
  await page.goto("/settings/playback");
  const select = page.getByRole("combobox", { name: "轉場效果", exact: true });
  await expect(select).toBeEnabled();
  await select.focus();
  await page.keyboard.press("Enter");
  await expect(select).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("End");
  const chosen = await page.locator("[role=option][data-active=true]").textContent();
  await page.keyboard.press("Enter");
  await expect(select).toHaveAttribute("aria-expanded", "false");
  await expect(select).toBeFocused();
  await expect(select).toContainText(chosen!.trim());
  await page.keyboard.press("Space");
  await page.keyboard.press("Home");
  await page.keyboard.press("Escape");
  await expect(select).toContainText(chosen!.trim());
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab");
  await expect(select).toHaveAttribute("aria-expanded", "false");
  await expect(select).not.toBeFocused();
});

test("ui-interactions Fleet dialog traps Tab and pending Escape then restores the trigger", async ({ page, api, runtime }) => {
  const profiles = await apiJson<{ data: Array<{ id: number }> }>(api, "GET", "/api/playback-profiles");
  const name = `focus-${runtime.runId}`;
  const group = await apiJson<{ data: { id: number } }>(api, "POST", "/api/device-groups", { data: { enabled: true, name, siteScope: "cl", playbackProfileId: profiles.body.data[0]!.id } });
  await page.goto("/device-fleet");
  const trigger = page.locator(".fleet-group-card").filter({ hasText: name }).getByRole("button", { name: "編輯", exact: true });
  await trigger.click();
  const dialog = page.getByTestId("group-edit-dialog");
  await expect(dialog.locator("[data-field=group-name]")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "取消", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.locator("[data-field=group-name]")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.locator("[data-field=group-name]").fill(`${name}-edited`);
  let pending: Route | undefined;
  await page.route(`**/api/device-groups/${group.body.data.id}`, (route) => { pending = route; });
  await dialog.getByRole("button", { name: "儲存群組", exact: true }).click();
  await expect.poll(() => Boolean(pending)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await pending!.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "fixture group save failed" }) });
  await expect(dialog.getByRole("button", { name: "取消", exact: true })).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("ui-interactions pending playback save stops held input and stays locked until both writes settle", async ({ page }) => {
  await page.goto("/settings/playback");
  const duration = page.locator(".ps-stepper-input").first();
  await expect(duration).toBeEnabled();
  const pending: Route[] = [];
  await page.route(/\/api\/playback\/(settings|pages)$/, async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    pending.push(route);
  });
  await duration.locator("..").locator("button").last().dispatchEvent("pointerdown");
  const draftValue = await duration.inputValue();
  await page.locator(".ps-save").click();
  await expect.poll(() => pending.length).toBe(2);
  await expect(duration).toBeDisabled();
  await expect(page.getByRole("combobox").first()).toBeDisabled();
  await expect(page.locator(".ps-resync")).toBeDisabled();
  await expect(page.locator(".ps-list-item[draggable=true]")).toHaveCount(0);
  await pending[0]!.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "fixture save failed" }) });
  // This crosses both the 350 ms long-press delay and several 80 ms repeats.
  await page.waitForTimeout(650);
  await expect(duration).toHaveValue(draftValue);
  await expect(page.locator(".ps-save")).toBeDisabled();
  await pending[1]!.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "fixture second save failed" }) });
  await expect(page.locator(".ps-save")).toBeEnabled();
  await expect(duration).toHaveValue(draftValue);
  await expect(page.getByText(/fixture .*save failed/).first()).toBeVisible();
});

test("ui-interactions conflict discard cancel failure and success preserve the expected history", async ({ page, api }) => {
  const original = (await apiJson<{ config: { version: number; regions: Record<string, unknown>; freeformObjects?: unknown[] } }>(api, "GET", "/api/display-pages/overview/draft")).body.config;
  await page.goto("/display-pages/editor?page=overview");
  await page.getByRole("button", { name: "編輯模式關閉", exact: true }).click();
  await page.getByRole("button", { name: "自由物件", exact: true }).click();
  await page.getByRole("button", { name: "新增線條", exact: true }).click();
  await apiJson(api, "PUT", "/api/display-pages/overview/draft", { data: { ...original, baseVersion: original.version } });
  await page.locator("[data-editor-toolbar-save]").click();
  const conflict = page.locator("[data-editor-remote-revision]");
  await expect(conflict).toBeVisible();
  const dirty = page.locator("[data-editor-toolbar-dirty]");
  page.once("dialog", (dialog) => dialog.dismiss());
  await conflict.getByRole("button", { name: "重載遠端" }).click();
  await expect(dirty).toHaveAttribute("data-editor-toolbar-dirty", "true");
  await expect(page.locator("[data-editor-toolbar]").getByRole("button", { name: "復原", exact: true })).toBeEnabled();
  await page.route("**/api/display-pages/overview/draft", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "fixture reload failed" }) }), { times: 1 });
  page.once("dialog", (dialog) => dialog.accept());
  await conflict.getByRole("button", { name: "重載遠端" }).click();
  await expect(dirty).toContainText("fixture reload failed");
  await expect(dirty).toHaveAttribute("data-editor-toolbar-dirty", "true");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("[data-editor-toolbar]").getByRole("button", { name: "重新同步", exact: true }).click();
  await expect(dirty).toHaveAttribute("data-editor-toolbar-dirty", "false");
  await expect(page.locator("[data-editor-toolbar]").getByRole("button", { name: "復原", exact: true })).toBeDisabled();
});

test("ui-interactions shell save and asset return keep parent and child dirty indicators aligned", async ({ page }) => {
  await page.goto("/display-pages/editor?page=overview&workspace=shell");
  await expect(page.getByRole("button", { name: "儲存殼層草稿", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "新增物件", exact: true }).click();
  await expect(page.locator("[data-shared-shell-dirty]")).toBeVisible();
  await expect(page.getByText("殼層尚未儲存", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "資產庫", exact: true }).click();
  await page.getByRole("button", { name: "殼層裝飾", exact: true }).click();
  await expect(page.locator("[data-shared-shell-dirty]")).toBeVisible();
  await expect(page.getByText("殼層尚未儲存", { exact: true })).toBeVisible();
  await page.route("**/api/shell-decorations/draft", (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "fixture shell save failed" }) });
  }, { times: 1 });
  await page.getByRole("button", { name: "儲存殼層草稿", exact: true }).click();
  await expect(page.getByText("fixture shell save failed", { exact: true })).toBeVisible();
  await expect(page.locator("[data-shared-shell-dirty]")).toBeVisible();
  await page.getByRole("button", { name: "儲存殼層草稿", exact: true }).click();
  await expect(page.getByText("殼層已同步", { exact: true })).toBeVisible();
  await expect(page.locator("[data-shared-shell-dirty]")).toHaveCount(0);
});

test("ui-interactions trend axes use metric units and forty percent remains below the top", async ({ page }) => {
  test.skip(process.env.VITE_HIDDEN_MANAGEMENT_ROUTES !== "/history", "trend evidence requires an isolated build with VITE_HIDDEN_MANAGEMENT_ROUTES=/history");
  await page.route("**/api/metrics/history?*", (route) => route.fulfill({ json: {
    range: "day",
    snapshots: [
      { capturedAt: "2026-09-12T00:00:00.000Z", generation: 0, consumption: 0, co2: 0, ratio: 20 },
      { capturedAt: "2026-09-12T01:00:00.000Z", generation: 2400, consumption: 2400, co2: 1, ratio: 40 }
    ]
  } }));
  await page.goto("/trends");
  const cards = page.locator(".et-card");
  for (const [index, unit] of ["kW", "kWh", "kWh", "%", "t"].entries()) {
    await expect(cards.nth(index).locator(".et-axis-labels span").first()).toContainText(unit);
  }
  await expect(cards.nth(3).locator(".et-axis-labels span").first()).toHaveText("100%");
  const plot = await cards.nth(3).locator(".et-chart-svg").boundingBox();
  const topTick = await cards.nth(3).locator(".et-axis-labels span").first().boundingBox();
  expect(Math.abs(topTick!.y + topTick!.height / 2 - (plot!.y + 8))).toBeLessThan(0.5);
  const line = cards.nth(3).locator(".et-area-line");
  await expect(line).toBeVisible();
  const coordinates = (await line.getAttribute("d"))!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  expect(coordinates[3]).toBeCloseTo(130.4, 8);
});

test("ui-interactions fresh FHD witness on the isolated runtime", async ({ api, runtime }, testInfo) => {
  test.skip(process.env.UI_INTERACTIONS_FHD_WITNESS !== "1", "opt-in fresh witness capture after the final repo gate");
  test.setTimeout(180_000);
  const profiles = await apiJson<{ data: Array<{ id: number }> }>(api, "GET", "/api/playback-profiles");
  const profileId = profiles.body.data[0]!.id;
  const draft = await apiJson<{ data: { revision: number } }>(api, "GET", `/api/playback-profiles/${profileId}/draft`);
  const pages = await apiJson<{ pages: Array<{ id: number }> }>(api, "GET", "/api/playback/pages");
  const settings = await apiJson<{ settings: Record<string, unknown> }>(api, "GET", "/api/playback/settings");
  await apiJson(api, "PUT", `/api/playback-profiles/${profileId}/draft`, {
    data: { expectedRevision: draft.body.data.revision, pages: pages.body.pages, settings: { ...settings.body.settings, startPage: pages.body.pages[0]!.id } }
  });
  const saved = await apiJson<{ data: { revision: number } }>(api, "GET", `/api/playback-profiles/${profileId}/draft`);
  await apiJson(api, "POST", `/api/playback-profiles/${profileId}/publish`, { data: { expectedRevision: saved.body.data.revision } });
  const pairingUrls: string[] = [];
  for (const siteScope of ["cl", "kn"]) {
    const name = `ui-witness-${siteScope}-${runtime.runId}`;
    const group = await apiJson<{ data: { id: number } }>(api, "POST", "/api/device-groups", { data: { enabled: true, name, siteScope, playbackProfileId: profileId } });
    const device = await apiJson<{ data: { id: number } }>(api, "POST", "/api/devices", { data: { clientId: name, displayName: name, enabled: true, groupId: group.body.data.id } });
    const pairing = await apiJson<{ data: { pairingPath: string } }>(api, "POST", `/api/devices/${device.body.data.id}/pairing-tokens`);
    pairingUrls.push(new URL(pairing.body.data.pairingPath, runtime.baseUrl).href);
  }
  const result = await promisify(execFile)("rtk", ["proxy", "pnpm", "run", "fhd:witness", "--", "--base-url", runtime.baseUrl, "--run-id", `ui-consistency-${runtime.runId}`], {
    env: { ...process.env, FHD_WITNESS_PAIRING_URL: pairingUrls[0], FHD_WITNESS_GUANYIN_PAIRING_URL: pairingUrls[1] },
    timeout: 150_000
  });
  writeFileSync(path.join(runtime.artifactDir, "fhd-witness-output.txt"), result.stdout);
  await testInfo.attach("fhd-witness-output", { body: result.stdout, contentType: "text/plain" });
});
