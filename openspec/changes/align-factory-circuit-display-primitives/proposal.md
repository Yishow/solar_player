## Why

`FactoryCircuit` 是 display 五頁中最容易形成視覺斷層的一頁：它擁有獨立的 node、connector、load row 與 KPI card 寫法，其中 KPI card 仍使用 page-local absolute layout，而 `Overview` 與 `Solar` 已經走向 shared display card primitives。這會讓同一組播放展示頁在卡片節奏、icon 容器、value row baseline、陰影與圓角上產生落差。

這個 change 聚焦補齊 `FactoryCircuit` 的 display primitive alignment。它不重新設計電力迴路圖，而是把 Factory 的 KPI、節點與 routing 視覺語言納入 display family：KPI 應優先採用 shared metric-card skeleton；flow/circuit node 應與 Solar flow node 共享更一致的展示節點語言；routing 線條應保留功能語意但提升 display-wall 質感。

## What Changes

- 將 `FactoryCircuit` KPI card 對齊 shared display metric-card family，避免維護獨立的 KPI card skeleton。
- 定義 `FactoryCircuit` circuit/flow node 與 `Solar` flow node 可共享的 display node vocabulary，包括 icon rhythm、surface、border、shadow、label/subtitle/value spacing。
- 定義 Factory routing line 的 display treatment：主線綠、重點/警示可橘、節點端點可有柔光，但不得影響資料語意。
- 保留目前 circuit diagram 的 FHD 幾何、資料綁定、slot binding、alert behavior、load row 內容與 routing topology。

## Non-Goals

- 不重新設計 Factory Circuit 的電力拓樸。
- 不改變 existing slot binding、alert semantics、live metrics、或 story payload。
- 不把 load row 強行改成 KPI card；load row 可以保留，但需能吃共用 surface/token 語言。
- 不改 `Solar` flow layout，只定義可共享的 node vocabulary。

## Capabilities

### New Capabilities

- `factory-circuit-display-primitive-alignment`: 定義 Factory Circuit 與 display family 共用的 KPI card、circuit node、routing line 與 load surface alignment contract。

### Modified Capabilities

- `factory-circuit-slot-binding-and-alerts`: 保留既有 binding/alert 行為，補充 visual primitive alignment 不得破壞 slot/alert semantics。

## Impact

- Affected specs: `factory-circuit-display-primitive-alignment`, `factory-circuit-slot-binding-and-alerts`
- Affected code:
  - `apps/web/src/pages/FactoryCircuit/index.tsx`
  - `apps/web/src/pages/FactoryCircuit/factoryCircuit.css`
  - `apps/web/src/components/displayPageCards.tsx`
  - `apps/web/src/components/displayPageCards.css`
  - optional shared node primitive under `apps/web/src/pages/shared` or `apps/web/src/components`
- Validation:
  - `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`
  - FactoryCircuit focused tests
  - `spectra validate --strict --changes align-factory-circuit-display-primitives`
