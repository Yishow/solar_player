## Why

現有 server integration 與 web unit/source tests 無法證明 REST、Socket.IO、SQLite 與 browser router 在同一個 runtime journey 中仍能協作。repo 已有 Playwright dependency，最小可行做法是加入少量 observable-contract smoke journeys，而不是建立大型脆弱 e2e suite。

## What Changes

- 建立隔離的 browser smoke runner：每次使用 temp database、temp uploads、固定 test port 與 deterministic mock mode，永不讀寫 production state。
- 鎖住四條 journeys：draft conflict→publish→playback refresh、image upload→playlist→fallback、data mode→readiness/rotation→live refresh、reload/socket reconnect→playback recovery。
- 只斷言 observable API／UI state，不做整頁 DOM snapshots 或把 FHD human acceptance 改成 pixel gate。
- 失敗時保留 screenshot、browser console、network summary 與 server log artifacts。

## Non-Goals

- 不覆蓋所有 management pages 或所有瀏覽器引擎。
- 不取代現有 server/web unit tests 與 FHD witness。
- 不為測試新增 production-only API bypass。

## Capabilities

### New Capabilities

- `critical-browser-smoke-verification`: 定義四條跨 REST／Socket.IO／SQLite／router journeys、隔離方式與失敗 evidence。

### Modified Capabilities

（無）

## Impact

- Affected specs: `critical-browser-smoke-verification`
- Affected code:
  - Modified: `package.json`, `.gitignore`
  - New: `playwright.config.ts`, `scripts/run-browser-smoke.mjs`, `tests/browser/fixtures/runtime.ts`, `tests/browser/critical-journeys.spec.ts`
  - Removed: none
