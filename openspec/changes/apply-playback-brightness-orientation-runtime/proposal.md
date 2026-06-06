## Why

`PlaybackSettings` 已持久化 `brightness`（number，預設 100%）與 `orientation`（landscape/portrait），PlaybackSettings 頁也有對應 UI，但這兩個值**完全沒有套用到 playback display surface**——調整後畫面不變。對一個實體 kiosk 展示播放器來說，亮度與直立/橫向是必備 runtime 行為。此外 Images 4-up thumbnail 因 playlist 僅 1 entry 無法驗證，需補 seed。本 repo 目前 `pnpm run build` 也有既有 tsc 錯誤，補 runtime 功能應同時讓 build 維持綠。

## What Changes

- 將 `settings.brightness` 以 `filter: brightness()` 套用到 DisplayCanvas playback surface（100% = 原樣）。
- 將 `settings.orientation` 套用到 playback surface：`portrait` 以 rotate 90° 呈現於直立螢幕，`landscape` 維持原樣。
- 補 image playlist seed（≥4 筆）讓 `/images` 4-up thumbnail 可被驗證。
- 修復既有 build 錯誤（`displayTransition.ts` undefined 窄化、`fhdEditorCapabilityGapLedger.test.ts`），使 `pnpm run build` 通過。

## Non-Goals

- 不改 PlaybackSettings 的 UI 或 settings schema（欄位已存在）。
- 不改 FHD canvas 的 1920×1080 設計座標；portrait 只在最外層 surface 旋轉，不重排各頁內容。
- 不改 MQTT、rotation、schedule、idle、transition 的既有行為（只修 transition 的型別錯誤）。
- 不新增 editor schema 或處理 playback 頁的 actual-gap（屬 Phase 4）。

## Capabilities

### New Capabilities

- `playback-display-runtime-controls`: Applies persisted brightness and orientation to the playback display surface, and seeds image playlist content sufficient to exercise the 4-up thumbnail strip.

## Impact

- Affected code:
  - Modified: `apps/web/src/components/DisplayCanvas.tsx`, `apps/web/src/layouts/LayoutShell.tsx`, `apps/web/src/hooks/displayTransition.ts`, `apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts`, `apps/server/src/db/seed.ts`
  - New: `apps/web/src/components/displayCanvasSurfaceStyle.ts`（brightness/orientation → style helper）+ 對應 test
