## Why

`displayPageCards` 已經把 `Solar`、`Overview`、`Sustainability`、`Images` 收斂到同一套 React 骨架，但各頁仍保留彼此分裂的 header 對齊、icon 呈現、文字節奏與內距 override。這讓同一個 card family 在畫面上看起來仍像三套不同語言，且一旦修正某一頁，容易在別頁再度漂移。

## What Changes

- 以 `Solar` KPI card header 作為唯一視覺 baseline，統一 card family 的 header 對齊、icon box、title/subtitle 節奏、value row 與 footer 間距 contract。
- 讓 `Overview`、`Sustainability`、`Images` 在保留既有內容型態的前提下，對齊同一套 card header / typography / spacing 語言，而不是各頁再寫一套 page-local rhythm。
- 補上 regression coverage，避免未來再把 `Solar` 原始 icon 資產、header 對齊或跨頁 typography contract 改回分裂狀態。

## Non-Goals

- 不改 card 的 `left`、`top`、`width`、`height` 或 page-level FHD 幾何。
- 不改頁面內容來源、文案、sparkline / growth note / metadata 等資訊結構。
- 不碰 `Factory Circuit`、display editor、`region tree`、draft/live publish 流程或其他 management surface。

## Capabilities

### New Capabilities

- `display-page-card-visual-language`: 定義 display card family 必須共用單一 header 視覺 contract，避免跨頁出現 header、icon、字體與間距語言分裂。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-page-card-visual-language`
- Affected code:
  - Modified:
    - `apps/web/src/components/displayPageCards.css`
    - `apps/web/src/components/displayPageCards.tsx`
    - `apps/web/src/pages/Solar/index.tsx`
    - `apps/web/src/pages/Solar/solar.css`
    - `apps/web/src/pages/Overview/index.tsx`
    - `apps/web/src/pages/Overview/overview.css`
    - `apps/web/src/pages/Sustainability/index.tsx`
    - `apps/web/src/pages/Sustainability/sustainability.css`
    - `apps/web/src/pages/Images/index.tsx`
    - `apps/web/src/pages/Images/images.css`
    - `apps/web/src/components/displayPageCards.test.tsx`
    - `apps/web/src/pages/Solar/cardFamily.test.ts`
    - `apps/web/src/pages/Overview/configRender.test.tsx`
    - `apps/web/src/pages/Sustainability/configRender.test.ts`
    - `apps/web/src/pages/Images/configRender.test.ts`
  - New: (none)
  - Removed: (none)
