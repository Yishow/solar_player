## Context

目前 5 個 display 頁的 icon 來源沒有統一的 persisted contract。`Solar` KPI 用 asset-backed image、`Overview` 與 `Images` 用 `ReferenceGlyph`、`Sustainability` 與 `FactoryCircuit` 依賴 page-local inline SVG registry。editor schema 只能調 geometry 與文案，無法選 icon source mode，也無法在 preview/runtime 間保證同一個 source 解析結果。

本 change 要讓 icon source 成為 editor 可管理的一級能力，但不把它擴大成任意 SVG 創作系統或媒體治理系統。

## Goals / Non-Goals

**Goals:**

- 讓 editor 為 5 個 display 頁的符合條件 region 顯示明確的 icon source controls。
- 讓 preview 與 runtime 共用同一個 icon resolver，維持 source-specific rendering parity。
- 支援 asset image、`ReferenceGlyph` key、page-local icon registry key 三種既有來源模型。
- 對無效 source 提供 editor validation 與安全 fallback。

**Non-Goals:**

- 不處理 hero/main-stage 媒體來源、playlist 圖像治理或 generic SVG upload。
- 不處理 card typography/surface、page chrome ornament 或 geometry。
- 不把 icon 顏色與 size token 包進本 change；那些留給 card/page chrome style contract。

## Decisions

### Represent icon source with an explicit mode-and-payload object

每個 eligible region 的 icon source SHALL 儲存為顯式 mode-and-payload object，而不是從 `src`、glyph key 或 page-local helper 函式推論。建議 shape 為：`mode` + mode-specific payload，例如 `asset-image` 搭配 `src`/`alt`，`reference-glyph` 搭配 `glyphName`，`page-icon-key` 搭配 `registry` 與 `iconKey`。

替代方案是維持今天的隱式判斷，例如有 `src` 就當 image，否則看 `glyphName`。這會讓 editor 難以提供正確欄位，也讓 validation 難以精準報錯，因此不採用。

### Keep page-local registries behind a shared icon resolver

`Sustainability` 與 `FactoryCircuit` 已有 page-local icon registry，因此本 change 不會強迫所有 icon 收斂成單一全域 registry。相反地，shared icon resolver 會接收 mode/payload，再委派到 `ReferenceGlyph`、asset image 或 page-local registry，讓 editor/runtime 只有一個入口，但頁面仍保有自己的 icon 集。

替代方案是立即把所有 page-local SVG registry 併成一個超大共用 icon package。這會擴大 scope，且不一定符合各頁語意邊界，因此不採用。

### Fail safe to seed icon source when source payload is invalid

當 icon source payload 不完整、registry/key 不存在，或 image src 無法解析時，系統 SHALL 回退到該 region 的 seed baseline icon source，同時在 editor 顯示 validation issue。preview 與 runtime 都不得因 icon source 無效而崩潰或渲染空白占位。

替代方案是遇錯時直接渲染空白。這會讓操作員難以知道是來源錯誤還是 layout 問題，也會放大 live playback 風險，因此不採用。

## Implementation Contract

- **Behavior**: 當操作員選到具 icon 的 KPI/info/status/node/load-row region 時，inspector SHALL 顯示 icon source mode 與對應欄位。變更後 preview SHALL 即時換成新 icon source；儲存、發布後，playback SHALL 使用相同 source mode 解析。
- **Interface / data shape**: 各 page config SHALL 為 eligible region 新增獨立 `iconSources` record，value 為 mode-and-payload object。shared icon resolver SHALL 根據 `asset-image`、`reference-glyph`、`page-icon-key` 三種 mode 輸出 `img` 或 `svg` node。
- **Failure modes**: 無效 source payload SHALL 回退 seed icon 並在 editor 顯示欄位 issue；不相容 registry/key SHALL 不得造成 runtime exception；`Solar` asset image mode SHALL 保留 `IMG` 輸出而不是被 generic SVG 取代。
- **Acceptance criteria**:
  - `Overview`、`Solar`、`FactoryCircuit`、`Images`、`Sustainability` 的 eligible region 均可在 editor 切換 icon source mode。
  - `Solar` KPI 在使用 `asset-image` mode 時，preview/runtime 仍輸出 `IMG`。
  - page-local registry key 可在 `Sustainability` / `FactoryCircuit` 正常解析，且 invalid key 會回退 seed baseline。
  - source-level tests 與 browser checks 可驗證 preview/runtime parity 與 fallback 行為。
- **Scope boundaries**:
  - In scope: icon source schema、editor inspector 欄位、shared icon resolver、五頁 eligible region wiring。
  - Out of scope: media source、color/style token、generic SVG upload、geometry/publishing。

## Risks / Trade-offs

- [Risk] page-local registry key 命名不一致，導致 shared resolver 介面複雜。 → Mitigation: payload 明確帶 `registry`，避免 resolver 猜頁面來源。
- [Risk] 增加 config 結構後，seed/default wiring 容易漏頁。 → Mitigation: 五頁都補 config render tests 與 resolver tests。
- [Risk] asset image 與 SVG node 的 DOM 輸出不同，測試容易只驗一種。 → Mitigation: 明確針對 `IMG` 與 `svg` 都寫 source-specific regression coverage。
