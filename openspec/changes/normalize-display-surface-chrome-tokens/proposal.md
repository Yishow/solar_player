## Why

目前 display 五頁已經有接近 prototype 的展示牆輪廓，但 `Overview`、`Solar`、`FactoryCircuit`、`Images`、`Sustainability` 仍在各自 CSS 中維護 hero typography、photo fade、leaf/gold ornaments 與 display semantic colors。`tokens.css` 已經有全域色票、字級、陰影與 shell tokens，但頁面仍大量直接寫 hex color、rgba、title 字級與 ornament 寫法，導致內容一變，質感就容易漂移。

這個 change 的目的不是重做頁面，而是把五頁共同的「展示牆外殼語言」收斂成可維護的 chrome/tokens contract：標題、照片融入、葉片水印、金線、卡片表面與展示用色應共享同一套語義，讓每頁內容可以變，但視覺家族感不變。

## What Changes

- 新增 display surface semantic tokens，收斂 title ink、eyebrow green、emphasis green/gold、card background、soft border、photo fade、ornament stroke/fill 等用途。
- 建立 shared hero typography / display chrome classes 或 primitives，讓五頁 hero title、eyebrow、subtitle 不再各自 hardcode 基礎樣式。
- 建立 shared photo fade / media stage contract，讓 Overview、Solar、Images、Sustainability 的 hero/main image 都能使用一致的霧化漸層與紙色融入策略。
- 建立 shared leaf/gold ornament contract，收斂目前 inline SVG、pseudo-element leaf 與 gold curve 的差異。
- 保留各頁現有 FHD `left/top/width/height`、editor schema paths、runtime config shape 與內容層級。

## Non-Goals

- 不重新設計任一 display page 的整體版型。
- 不調整五頁目前的 FHD 幾何座標、卡片數量、資料內容或頁面資訊架構。
- 不改 backend API、story payload、MQTT/live metrics contract。
- 不把 management pages 強制套入 display surface chrome；本 change 只針對 display playback surface。

## Capabilities

### New Capabilities

- `display-surface-chrome-system`: 定義 display 五頁共用的 chrome/tokens、hero typography、photo fade、leaf/gold ornaments 與 surface semantic color contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-surface-chrome-system`
- Affected code:
  - `apps/web/src/styles/tokens.css`
  - `apps/web/src/pages/shared/displayPageChromeConfig.ts`
  - New shared display chrome primitives/classes under `apps/web/src/pages/shared` or `apps/web/src/components/display*`
  - `apps/web/src/pages/Overview/overview.css`
  - `apps/web/src/pages/Solar/solar.css`
  - `apps/web/src/pages/FactoryCircuit/factoryCircuit.css`
  - `apps/web/src/pages/Images/images.css`
  - `apps/web/src/pages/Sustainability/sustainability.css`
- Validation:
  - `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`
  - targeted web tests for shared chrome primitives where applicable
  - `spectra validate --strict --changes normalize-display-surface-chrome-tokens`
