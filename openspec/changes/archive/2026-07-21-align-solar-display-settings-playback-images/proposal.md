## Why

`/settings/playback` 與 `/settings/images` 都屬於低到中風險設定頁：有保存或操作，但沒有 MQTT topic mapping 那麼重的狀態流，也沒有 circuits CRUD 那麼多結構變異。它們適合作為 management 的第一個低風險 batch。

## What Changes

- 只處理 `/settings/playback` 與 `/settings/images` 的 prototype 對位。
- 保留 playback settings 的保存、重排、啟用開關流程。
- 保留 image management 的資產狀態、快速操作定位與可讀性。

## Capabilities

### New Capabilities

- `settings-playback-images-alignment`: 定義 `/settings/playback` 與 `/settings/images` 的 low-risk settings batch 對位與驗證。

### Modified Capabilities

(none)

## Impact

- Affected specs: `settings-playback-images-alignment`
- Affected code:
  - Modified:
    - `apps/web/src/pages/PlaybackSettings/index.tsx`
    - `apps/web/src/pages/ImageManagement/index.tsx`
    - `apps/web/src/services/api.ts`
  - New:
    - `apps/web/src/pages/PlaybackSettings/` 或 `apps/web/src/pages/ImageManagement/` 下的 page-local mapping 檔案
    - `openspec/changes/align-solar-display-settings-playback-images/specs/`
  - Removed:
    - (none)
