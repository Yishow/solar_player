## Context

這個 change 針對 display playback family 的 card drift。`Solar` 目前已經形成最穩定的 KPI card 視覺語言：清楚的 icon/header/value/footer 節奏、淡白底卡、細亮邊與柔陰影。相對地，`Overview`、`Sustainability` 與 `Images` 雖然都屬同一套 FHD display surface，卻各自維護不同的 card DOM 與局部 token，導致 icon 容器、字級、數值列對齊與 footer 節奏逐步偏離；其中 `Overview` KPI 的 value row 目前還有偏左問題。

這次工作有三個強限制：

- 使用者指定以 `Solar` card 當 source of truth。
- 外觀不可改壞，不能重做頁面幾何、卡片數量或資訊層級。
- scope 僅限 card family alignment，不碰 `FactoryCircuit` load row、editor canvas、region tree、或任何 FHD 座標調整。

## Goals / Non-Goals

**Goals:**

- 建立一套可共用的 display card primitives，讓 `Solar`、`Overview`、`Sustainability`、`Images` 收斂到同一家族的 header / value row / footer 骨架。
- 讓 KPI / stat 類 card 的數值列改為 card 內容區水平置中，不再依賴各頁局部 `padding-left` 或偏移寫法。
- 收斂 icon 到一致的 SVG 語言與尺寸節奏，同時保留各頁既有內容型態，例如 `Overview` sparkline、`Sustainability` growth note / bullet list、`Images` metadata strip。
- 讓 `Overview` summary 與 `Images` info card 進入同一套 info-card family，而不是沿用完全獨立的表面語言。

**Non-Goals:**

- 不改 `Solar` flow node、connector、hero/title composition。
- 不把 `FactoryCircuit` load row 併成標準 card primitive。
- 不改 `DisplayCanvas` scaling、card 的 FHD `left/top/width/height`，也不做新一輪頁面 reference layout 對位。
- 不新增新的 backend contract、story payload、或 editor schema。

## Decisions

### Create shared display card primitives instead of token-only CSS alignment

只統一 CSS token 會讓各頁繼續保有不同 DOM 骨架，之後仍然會再漂。這次將新增共用 card primitives，例如 frame、header、value row、footer slots，讓 `Solar`、`Overview`、`Sustainability` 與 `Images` 在 JSX 結構上共用同一套節奏，再由頁面注入各自內容。

替代方案是只改各頁 CSS；這種做法改動較小，但無法保證 icon/header/footer 節奏長期一致，因此不採用。

### Treat Solar KPI cards as the visual source of truth while preserving page-specific content slots

`Solar` KPI card 已經是這個 repo 最穩定的 card reference，因此共用 primitive 的預設圓角、邊框、陰影、icon 尺寸、字級與 value/unit 節奏都以它為 baseline。但其他頁面不需要硬套成完全同構：footer slot 仍允許放 helper text、sparkline、growth note、metadata strip 或 bullet list。

替代方案是把所有頁面硬壓成單一高階 schema-driven card。這會讓 `Sustainability` 與 `Images` 失去內容彈性，也容易擴大 scope，因此不採用。

### Keep page geometry and information density fixed while centering the value row within the card body

本次對齊必須保留既有 FHD layout 與卡片尺寸，不應因為抽共用 component 而改動 card 的 `left/top/width/height`。數值置中只調整 card 內部的 content alignment：value row 需在可用內容區內水平置中，unit 與 value baseline 對齊，但 sparkline、metadata 或 narrative 區塊仍可依頁面特性保留既有高度分配。

替代方案是透過改寬度或重新分配卡片內容高度來取得置中視覺。這會碰到 reference layout 與播放頁幾何，不符合 scope，因此不採用。

### Split the shared family into metric-card and info-card surfaces

不是所有 card 都屬於同一種類。`Overview` KPI 與 `Sustainability` KPI/stat 接近 metric-card；`Overview` summary 與 `Images` info card 則接近 info-card。這次會共用同一個 frame language，但保留兩個 surface variants，避免把 summary/info 內容硬塞進 KPI 模板。

替代方案是只做一個通用 card component。這會讓 summary/info 要依靠過多 conditionals 才能成立，長期維護成本更高，因此不採用。

## Implementation Contract

**Behavior**

- `/solar` 的 KPI cards SHALL continue acting as the visual baseline for display card styling.
- `/overview` KPI cards SHALL render with the shared metric-card skeleton and a centered value row while preserving existing card count, layout geometry, accent icon usage, and sparkline footer.
- `/overview` summary SHALL render as a shared info-card family surface instead of an isolated styling one-off, while preserving its current status tone behavior and compact footprint.
- `/sustainability` KPI cards and stat cards SHALL render through the shared card family while preserving each card's existing content mode: value + sparkline, value + growth note, bullet list, or narrative block.
- `/images` info card SHALL render through the shared info-card family while preserving the current title/body/metadata composition and leaving the main stage, thumbnails, and arrows unchanged.

**Interface / data shape**

- A new shared frontend primitive layer SHALL expose reusable card building blocks for frame, header, value row, and footer/content slots.
- The shared metric-card primitive SHALL accept icon content, zh/en title content, value text, unit text, and a footer slot.
- The shared info-card primitive SHALL accept icon content, title content, body content, and a footer/meta slot.
- Existing page view models and runtime config shapes SHALL remain valid; this change SHALL NOT require new API fields or new display config schema paths.

**Failure modes**

- If a page-specific footer slot has no sparkline or metadata content, the card SHALL remain readable and structurally complete rather than collapsing the frame.
- If a page continues to receive partial story or fallback data, the card family SHALL preserve the existing fallback presentation rules instead of blanking, clipping, or shifting geometry.
- If an icon cannot be resolved from the shared SVG family, the page SHALL continue rendering a readable label/value card without changing its size or geometry.

**Acceptance criteria**

- `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` succeeds.
- Targeted web tests cover the shared card family mapping, including the centered value row expectation for Overview KPI cards.
- Manual review confirms `/overview`, `/solar`, `/sustainability`, and `/images` keep their current FHD card geometry and information density while sharing the Solar-derived card skeleton.
- Manual review confirms value rows for KPI/stat cards are visually centered within the card body rather than left-biased.

**Scope boundaries**

- In scope: `Solar` KPI cards as baseline, `Overview` KPI cards, `Overview` summary, `Sustainability` KPI/stat cards, `Images` info card, shared SVG icon language, and shared card primitives.
- Out of scope: `FactoryCircuit` load rows, flow nodes, gallery main stage, page geometry changes, display editor interactions, region tree, backend contracts, and new display config schema.

## Risks / Trade-offs

- [共用 primitive 過度抽象，反而把 `Sustainability` 與 `Images` 的特例塞成大量條件分支] → 以 metric-card / info-card 兩個 surface variants 分流，避免單一萬用元件。
- [以 `Solar` 為 baseline 時不小心把其他頁既有外觀改壞] → 把「外觀不變、幾何不變、資訊密度不變」寫成 acceptance 與 scope boundary，人工 review 對照四頁。
- [數值置中若只用 CSS 微調，後續又被各頁覆蓋回偏左] → 將 value row 置中收進 shared primitive，而不是只在單頁補 patch。
