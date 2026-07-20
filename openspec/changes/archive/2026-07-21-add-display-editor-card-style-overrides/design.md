## Context

目前 `Overview`、`Solar`、`Sustainability`、`Images` 的 card 類區塊已部分共用 `DisplayCardFrame`、`DisplayCardHeader`、`DisplayCardValueRow`、`DisplayCardFooter`，但 editor schema 只覆蓋文案、媒體 placement 與幾何。真正決定 card 視覺語言的 typography、spacing、surface token 仍被鎖在 page-local CSS 與 shared CSS fallback 中，導致操作員無法在 editor 內做可持久化的小幅調整。

本 change 要補的是 editor/runtime 之間缺少的 style override contract，而不是重新設計 card family。既有 FHD 幾何、shared card 結構與 publish 流程都應維持不變。

## Goals / Non-Goals

**Goals:**

- 讓 display editor 可為已採 shared card family 的 region 持久化調整 card appearance token。
- 讓 draft preview、live playback 與 publish 後畫面從同一份 config 解析 card style，而不是分別靠 editor-local 與 page-local CSS。
- 讓 card style 欄位細到足以處理 title/subtitle/value/unit typography、padding、radius、header gap、icon box、footer spacing、value-row alignment。
- 讓缺漏或非法欄位值回退到 Solar-aligned shared baseline，避免 card 破版。

**Non-Goals:**

- 不處理 icon source mode、hero/main-stage media source、page chrome ornament 或 story data。
- 不改 `left`、`top`、`width`、`height` 或固定 FHD canvas 的縮放模型。
- 不把 `FactoryCircuit` node/load-row 外觀納入本 change。
- 不變更 draft/live publishing、`region tree`、management shell。

## Decisions

### Store card style overrides alongside region config

card appearance override 將以 per-page `cardStyles` record 儲存，而不是把 style token 混進既有幾何 rect。`cardStyles` 由頁面語意 key 索引，例如 `overview.power`、`solar.generation`、`sustainability.totalGeneration`、`images.infoPanel`。這樣可把幾何與外觀拆開，避免後續 reset geometry 時誤清 style，或 style-only 調整造成 geometry dirty。

替代方案是把 typography/padding 直接塞進 `kpiCards[key]` 這類幾何物件。這會讓 rect schema 持續膨脹，並增加 editor geometry clipboard 與 layout preset 的偶發耦合，因此不採用。

### Reuse shared display card primitives as the only renderer

所有 style override 都必須先被解析成 shared card primitive 可理解的 token，再由 `displayPageCards` 套到 CSS variables 或 props。page-local CSS 只保留內容槽位、page-specific body/footer 內容，以及必要的非共用 surface 細節；不得再以 page-local selector 重新發明 title/subtitle/value/footer baseline。

替代方案是讓每頁自己讀 config 後手動拼 inline style。這會把同一份 style contract 在四頁複製四次，日後 drift 會再次出現，因此不採用。

### Keep card appearance separate from geometry and source binding

card style 欄位只涵蓋 typography/rhythm/surface：例如 `titleFontSize`、`subtitleFontSize`、`valueFontSize`、`unitFontSize`、`headerGap`、`iconBoxSize`、`paddingTop`、`paddingRight`、`paddingBottom`、`paddingLeft`、`cornerRadius`、`footerPaddingTop`、`valueRowAlign`。顏色、icon source、media source 與 geometry 仍屬其他 change，以免本 change scope 擴散。

替代方案是一次把 color、icon、media 都做進 card style。這會讓資料 shape、驗證規則與 UI 欄位在同一輪急速膨脹，不符合這次要小而完整的邊界，因此不採用。

## Implementation Contract

- **Behavior**: 當操作員在 editor 選到 `Overview`、`Solar`、`Sustainability`、`Images` 的 card region 時，inspector SHALL 顯示可持久化的 card appearance 欄位。改動後，editor preview SHALL 立即反映；儲存、發布後，對應 playback route SHALL 呈現相同樣式。
- **Interface / data shape**: 各 page config SHALL 新增獨立 `cardStyles` record，key 對應頁面語意 card key，value 為只包含 typography/rhythm/surface token 的 object。shared card primitives SHALL 接受 resolved token map，而不是直接讀 page-local magic number。editor schema SHALL 以現有 `number` / `select` / `text` 欄位描述這些 token。
- **Failure modes**: 缺漏 token 時 SHALL 回退到 shared baseline；非法數值 SHALL 在 editor 顯示 validation issue，且不得阻止其他合法欄位預覽；未知 cardStyle key SHALL 被忽略並回退 seed baseline。
- **Acceptance criteria**:
  - editor 可對 eligible card region 顯示 style 欄位，且變更後 preview 即時更新。
  - `Overview`、`Solar`、`Sustainability`、`Images` 在 save/publish 後保留同樣的 card style。
  - 幾何 clipboard、layout preset、region drag/resize 不因 style-only 變更而改寫 `left/top/width/height`。
  - source-level tests 與 browser checks 可驗證 shared card primitives 正在讀取 persisted style override，而不是 page-local hardcode。
- **Scope boundaries**:
  - In scope: shared display card family、四個頁面的 card-style config、editor inspector 欄位、preview/runtime style resolver、validation/reset。
  - Out of scope: icon/media source、Factory Circuit、story data、publishing workflow、page chrome ornaments。

## Risks / Trade-offs

- [Risk] region key 與 runtime render key 對不上，導致 editor 改到無效 style record。 → Mitigation: 只使用既有 page config 的語意 key，並加上 source-level render/config tests。
- [Risk] style token 太多讓 inspector 過度擁擠。 → Mitigation: 以群組化欄位與 resettable defaults 呈現，先聚焦 typography/rhythm/surface 的高價值欄位。
- [Risk] page-local CSS 仍偷偷覆寫 shared baseline。 → Mitigation: 新增 regression coverage，鎖住 page-local CSS 不得重新定義 shared card baseline selector。
