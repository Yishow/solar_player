## Context

與 display surface pages 不同，settings / management form-heavy pages 的主要風險不是版面難畫，而是它們本身承載大量操作契約。`/settings/playback` 涉及排序與儲存，`/settings/images` 涉及上傳、選取、預覽與錯誤狀態，`/settings/mqtt` 涉及 load/save/test/topic mapping 多種 runtime 狀態，`/settings/circuits` 則有 list/save/update/validation。這些頁面若只追 reference 視覺，很容易把真正可操作的 controls 壓壞。

因此這個 change 的策略必須和 display batch 不同：不強求所有頁面都改成 playback canvas，而是根據 reference 決定哪些區塊保留 management shell，哪些區塊套用 reference panel、reference form row、reference status pill 與 dense board hierarchy。此 change 的核心是「保留操作，改造視覺層次」，尤其是把高風險頁 `/settings/mqtt`、`/settings/circuits` 的 display state 集中起來。

## Goals / Non-Goals

**Goals:**

- 遷移 `/settings/playback`、`/settings/images`、`/settings/mqtt`、`/settings/circuits` 的 panel hierarchy 與 form layout，使其更接近 reference prototype。
- 讓這些頁面改用 shared reference panels、cards、status pills、form rows，而不是 generic dashboard cards。
- 為 `/settings/mqtt` 與 `/settings/circuits` 建立 explicit display-state mapping，集中處理 loading、disabled、error、success、status 與 validation state。
- 保留所有原有 interaction contract，不讓 save/test/upload/selection/update 退化成裝飾。

**Non-Goals:**

- 不處理 playback/display routes。
- 不重寫 backend API、topic mapping schema、image import pipeline 或 circuit config schema。
- 不讓 form 視覺為了接近 reference 而犧牲可讀性或可點擊性。
- 不在本 change 內大改 shared shell host。

## Decisions

### Keep management shell semantics and align page internals with reference panels

決策：settings 頁面保留 management shell semantics，不強行套用 playback canvas；reference alignment 主要發生在 page internals，也就是 panel hierarchy、form grouping、action area、status board、dense table 與 preview panel。

理由：這些頁面本質上是操作頁，不是播放頁。若硬把它們都轉成 playback canvas，反而會讓 form/control 可用性下降，且 scope 會不必要膨脹。

替代方案：
- 全部 settings pages 直接改成 playback canvas。拒絕原因：不符合操作頁本質，也提高 regression 風險。

### Introduce explicit display-state mapping for MQTT and circuits

決策：`/settings/mqtt` 與 `/settings/circuits` 的 display state 一律由 page-local mapping 或 view-model 輸出，不讓 JSX 同時承擔 broker status、test result、topic preview、validation、error、disabled branches。

理由：這兩頁的 runtime state 最複雜。若視覺遷移時把狀態分支散落到 reference panels 裡，往後任何小修改都會變得脆弱。

替代方案：
- 在 route JSX 中按區塊就地寫條件分支。拒絕原因：維護成本高，且最容易漏掉某種 state combination。

### Split low-risk and high-risk settings routes inside one change

決策：同一個 change 內分兩個 implementation phase：低風險 `/settings/playback`、`/settings/images` 先做；高風險 `/settings/mqtt`、`/settings/circuits` 後做，並附最小必要驗證。

理由：這四頁共享相同的 reference panel / form primitive，但高風險頁需要更嚴格的 display-state 與 test gate。分 phase 可以避免 apply 時一次把所有風險混在一起。

替代方案：
- 四頁完全分成四個 change。拒絕原因：reference panel / form row 的重複說明太多。
- 四頁一次平推。拒絕原因：MQTT 與 circuits 的 regression 風險會淹沒低風險頁問題。

## Implementation Contract

**Behavior**

- `/settings/playback`、`/settings/images`、`/settings/mqtt`、`/settings/circuits` 渲染後，panel hierarchy、form grouping、status board、preview area 與 action area 應接近對應 reference page。
- 所有原有操作必須維持可用：playback settings 的保存與排序、image management 的上傳/選取/預覽、MQTT settings 的 load/save/test/topic mapping、circuit settings 的 list/save/update/validation。
- `/settings/mqtt` 與 `/settings/circuits` 必須有 explicit display-state mapping，避免 JSX 分支失控。

**Interface / data shape**

- 現有 `viewModel.ts` 可增加 display-facing fields，例如 panel section IDs、button labels、status tones、preview card models、row display fields，但不得改 service/backend payload shape。
- `/settings/mqtt` 仍沿用現有 load settings、load topics、save settings、save topics、test connection、reload topics 的 route-level API contract。
- `/settings/circuits` 仍沿用現有 circuit CRUD 與 validation contract。
- `/settings/images` 仍沿用現有 upload/library/selection/preview contract。

**Failure modes**

- 若 reference panel 導致 form 欄位過度壓縮或 actions 不可點，視為未完成。
- 若遷移後 save/test/upload/update 只剩視覺按鈕而失去原行為，視為重大 regression。
- 若高風險頁沒有 explicit display-state mapping，後續維護風險過高，視為未達成 contract。

**Acceptance criteria**

- `pnpm --filter @solar-display/web build` 成功。
- 若測試檔存在，執行最小必要 server tests：MQTT 與 circuits 至少跑對應 route tests。
- 人工檢查四頁在 loading、error、success、disabled、empty-state 情境下仍可操作且版面可讀。

**Scope boundaries**

- In scope：四條 settings routes 的 panel hierarchy、form grouping、display-state mapping、reference panel primitives、page-local layout constants。
- Out of scope：playback/display routes、backend contract、MQTT schema 變更、image import 流程重寫、circuit data model 變更。

## Risks / Trade-offs

- [reference 視覺可能壓縮操作區] → 以可用性優先，允許與 reference 有少量 spacing 差異。
- [高風險頁 state 太多] → 要求 explicit display-state mapping，並保留最小必要 tests。
- [同一個 change 含四頁可能過大] → 以 low-risk / high-risk phase 拆 tasks，並把 acceptance criteria 寫清楚。
- [shared reference panels 若設計錯誤，四頁都會受影響] → 先在低風險頁驗證 panel/form primitives，再套到高風險頁。
