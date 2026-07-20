## Why

`/images` 與 `/sustainability` 都是 media-heavy / storytelling-heavy 的 playback 頁，與 KPI 頁、flow 頁風險不同。把這兩頁獨立成 change，可以專注處理 media slot、placeholder、big-number storytelling 與 fallback presentation。

## What Changes

- 只處理 `/images` 與 `/sustainability` 的 prototype 對位。
- 保留圖片切換、placeholder 與 sustainability summary fallback contract。
- 為這兩頁輸出 playback media evidence bundle。

## Capabilities

### New Capabilities

- `playback-images-sustainability-alignment`: 定義 `/images` 與 `/sustainability` 的 prototype 對位、media/summary fallback 與 evidence expectations。

### Modified Capabilities

(none)

## Impact

- Affected specs: `playback-images-sustainability-alignment`
- Affected code:
  - Modified:
    - `apps/web/src/pages/Images/index.tsx`
    - `apps/web/src/pages/Sustainability/index.tsx`
    - `apps/web/src/mocks/images.ts`
    - `apps/web/src/mocks/sustainability.ts`
  - New:
    - `apps/web/src/pages/Images/` 或 `apps/web/src/pages/Sustainability/` 下的 page-local adapter / fallback mapping 檔案
    - `openspec/changes/align-solar-display-playback-images-sustainability/specs/`
  - Removed:
    - (none)
