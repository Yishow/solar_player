## Why

就算 server 端已有真實 weather 資料，header 若沒有正式的顯示契約，仍會回到硬編字串、欄位爆版或在資料缺口時直接消失。這個 change 專注把 header weather 變成可配置、可退化、可測試的 shell metadata，而不是再放回一次臨時文案。

## What Changes

- 修改 playback / management shell header metadata 契約，讓 header 可讀取已正規化的 weather state，而不是只吃單一字串。
- 將 header weather 改為主資訊 + 次資訊兩行呈現，並定義欄位優先序、截斷規則與 fallback 文案。
- 明確限制 header 只能顯示來自內部 weather contract 的真實資料，不可回退到偽造晴天或靜態溫度。
- 補齊 header weather rendering 與殼層 metadata mapping 的測試，確保連線狀態 badge 與 weather copy 可同時成立。

## Non-Goals

- 本 change 不負責串接 CWA 或設計 weather 設定資料表。
- 本 change 不重排 `MQTT Settings` 頁面，也不新增 weather 編輯表單。
- 本 change 不承諾即時 socket push 天氣更新；只定義 header 如何消費既有內部資料來源。

## Capabilities

### New Capabilities

- `playback-header-weather-metadata`: 定義 header weather 的兩行 metadata、欄位組裝、fallback 與版面保護規則。

### Modified Capabilities

- `playback-header-live-status`: 將既有「不得顯示偽造 weather」規則提升為「僅可顯示真實且已配置的 weather metadata，否則維持中性 fallback」。

## Impact

- Affected specs: `playback-header-weather-metadata`, `playback-header-live-status`
- Affected code:
  - New:
    - `apps/web/src/components/headerWeatherMeta.ts`
    - `apps/web/src/components/headerWeatherMeta.test.ts`
  - Modified:
    - `apps/web/src/components/AppHeader.tsx`
    - `apps/web/src/components/AppHeader.test.ts`
    - `apps/web/src/layouts/LayoutShell.tsx`
    - `apps/web/src/layouts/ManagementShell.tsx`
    - `apps/web/src/components/shellFoundation.test.ts`
    - `apps/web/src/styles/tokens.css`
    - `packages/shared/src/weather.ts`
    - `packages/shared/src/index.ts`
  - Removed: (none)
