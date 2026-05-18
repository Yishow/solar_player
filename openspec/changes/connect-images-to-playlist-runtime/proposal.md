## Why

`/images` 目前仍以 page-local `imageMocks` 組裝 active slide、metadata 與 fallback 文案，但 server 早已提供 `/api/image-playlist` 作為排序、duration、fallback mode 與 entry metadata 的正式 runtime。若不把播放頁接回 playlist domain，Images 仍然只是 prototype-aligned mock page，不算完成這輪 MVP。

## What Changes

- 讓 `Images` 播放頁以 `/api/image-playlist` 回傳的 active entry 與 ordered entries 作為主要資料來源。
- 將 info panel、slide counter、per-entry duration、fallback mode 與 metadata 顯示改為依 playlist payload 決定，而不是 page-local mock。
- 保留 `display page config` 與 seed-backed main stage / thumbnail layout，不改動這輪已接受的 FHD 幾何。
- 保留缺 asset、pending asset、fallback mode 觸發時的 placeholder / use-cover presentation，不為了填滿 slot 發明新後端契約。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `images-playlist-management`: 讓 Images 播放頁正式以 ordered playlist entries 與 per-entry duration 驅動展示內容。
- `images-slide-metadata-panels`: 讓 Images info panel 使用 playlist metadata，而不是只依賴 page-local raw mocks。

## Impact

- Affected specs: `images-playlist-management`, `images-slide-metadata-panels`
- Affected code:
  - Modified: `apps/web/src/services/api.ts`
  - Modified: `apps/web/src/pages/Images/index.tsx`
  - Modified: `apps/web/src/pages/Images/viewModel.ts`
  - Modified: `apps/web/src/pages/Images/viewModel.test.ts`
  - Modified: `apps/web/src/pages/Images/configRender.test.ts`
