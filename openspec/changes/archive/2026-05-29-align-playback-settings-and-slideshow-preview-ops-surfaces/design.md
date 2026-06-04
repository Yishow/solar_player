## Context

`Playback Settings` 與 `Slideshow Preview` 實際上共享同一組 rotation/runtime truths：configured pages、effective playable sequence、skip reasons、instance-aware live previews、countdown 與 current page state。但目前 `Playback Settings` 仍以 route-local preview strip + 多張 settings cards 為主，`Slideshow Preview` 則以 carousel/showcase 語言呈現，導致操作上像兩套關聯薄弱的工具。

## Goals / Non-Goals

**Goals:**

- 讓 `Playback Settings` 與 `Slideshow Preview` 讀成同一個 rotation operations family。
- 補齊 configured rotation 與 effective rotation 的差異呈現，讓 skip、instance、preview parity 更清楚。
- 保留 live preview、page-instance identity、rotation debug 的可驗證性。

**Non-Goals:**

- 不在這個 change 內重做 display page runtime 本身。
- 不新增新的 playback page template 或改動 editor page authoring schema。
- 不把 `Slideshow Preview` 變成純 settings form，也不把 `Playback Settings` 變成純 carousel showcase。

## Decisions

### Use a two-board model for configured rotation and effective rotation

`Playback Settings` 應同時呈現 configured rotation 與 effective playable sequence。前者負責 registry/order/duration/enabled governance，後者負責 skip reasons、目前實際播放順序、preview parity 與 countdown。這能避免現在把兩種真相擠在同一個 preview 區塊裡。

### Reuse one preview status and action language across playback and slideshow preview

兩頁都會用到 preview boards、status summaries、countdown/progress、current page identity 與 rotation diagnostics，因此 action bar、status rail、preview board、summary strip 應共用同一套 surface primitives；差別只保留在 `Playback Settings` 多出治理 controls、`Slideshow Preview` 多出 QA/debug-oriented playback visualization。

### Preserve instance-aware preview identity instead of template-level grouping

rotation surfaces 必須維持 page-instance identity，不能因為兩張 page 共享 template key 就重用同一個 preview state。`configured` 與 `effective` boards 都要以 page instance 為中心呈現，讓 duplicate overview/solar pages 仍可被區分與驗證。

## Implementation Contract

**Behavior**

- `Playback Settings` SHALL 清楚區分 configured rotation governance 與 effective rotation/runtime diagnostics。
- `Slideshow Preview` SHALL 與 `Playback Settings` 使用同一套 preview/status/action language，並保留 current page、countdown、progress、skip/debug context。
- 兩頁 SHALL 讓 operators 看得出某個 page instance 是 configured、effective playable、currently skipped、或 currently active。

**Interface / data shape**

- rotation summary data SHALL 至少區分 configured rows、effective playable rows、skipped rows、current active row 與 page-instance preview state。
- shared preview/status primitives SHALL 能同時服務 `Playback Settings` 與 `Slideshow Preview`，並接受 instance-aware preview definitions / states。

**Failure modes**

- 若 configured 與 effective sequence 再次被混成單一列表，視為 change 未完成。
- 若 duplicate page instances 在 preview surface 上無法區分，或 skip reasons 只能在次要小字中找到，視為 regression。

**Acceptance criteria**

- `Playback Settings` 與 `Slideshow Preview` 都有明確可見的 preview family surface，且 action/status semantics 一致。
- playback / slideshow 相關 tests 能驗證 configured/effective separation、skip diagnostics 與 instance-aware previews。
- manual review 能直接回答「這頁設定了什麼」「實際會播什麼」「哪幾頁被 skip」「目前正在播哪一頁」。

**Scope boundaries**

- 本 change 只完成 rotation governance 與 preview/debug surface，不延伸到 editor authoring 或 playback runtime engine 新功能。
- page registry CRUD 仍留在 `Playback Settings`，但其 surface 需融入這套 family。

## Risks / Trade-offs

- [過度把兩頁做成同一張皮，失去各自角色] → 共享 surface language，但保留治理板與 QA/debug 板的不同資訊節奏。
- [effective rotation 資訊太多，反而更難掃讀] → 以 configured / effective / skipped 分區，不把所有狀態堆在同一列。
- [preview parity 被 template-level fallback 稀釋] → 明確要求 instance-aware preview identity，避免 duplicate page 混淆。
