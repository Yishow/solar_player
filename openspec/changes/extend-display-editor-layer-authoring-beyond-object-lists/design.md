## Context

目前 editor 的 selection surface 已經分成兩條軸線：一條是 media source / effect authoring，會把可見容器導向真正持有 effect config 的 source；另一條才是 z-order authoring，主要仍卡在左側 list。上下層能力本身也分成三類：固定版位 regions 根本沒有 layer authoring、freeform objects 有左側 list 的前移/後移、shared shell objects 也有自己的 list 與部分 inspector 欄位。問題不是所有東西都需要任意 z-index，而是 editor 還沒把「哪些可調、從哪裡調、哪些不能調、哪些其實只是支援 effect 不是支援 layer」說清楚。

## Goals

- 讓 reorderable authoring nodes 在目前 selection context 下可直接調整 layer，不必先回左側 list 猜。
- 對 fixed-layout regions 顯示明確 explanation，而不是留白。
- 保留既有 object list 操作，避免熟悉舊流程的使用者失去入口。

## Non-Goals

- 不把所有 page regions 都變成任意 z-index 可編輯。
- 不引入任意數值化圖層編輯給固定版位背景或 seed-backed layout regions。
- 不重寫 freeform object 或 shell object 的 underlying ordering data shape。

## Decisions

### Define reorderable eligibility explicitly

只有 freeform objects、shared shell decoration objects、以及 schema 明確標記為可排序的 authoring nodes 才能顯示 layer controls。固定 layout regions 只能顯示 read-only explanation，不會硬塞一個其實無效的上下層按鈕。

### Surface layer controls from the current selection

當使用者從畫布或 region tree 選到可重排物件時，右側 `屬性` 或對應的 selection action area 應顯示前移、後移、移到最前、移到最後等層級操作。這些 controls 要和左側 list 維持同一份 ordering state。

### Keep z-order eligibility separate from media-effect support

可見 media container 現在可能因為 effect authoring 被導到真正的 source region，但這不代表該 selection 也支援 z-order 編輯。layer authoring eligibility 必須獨立判斷，避免把「支援 effects」誤讀成「支援任意重排」。

### Keep list controls as a parallel entry point

既有 object list 仍然保留，因為它對批次掃描與相對順序理解仍有價值；但它不再是唯一入口。任何 reorder action 都必須同步更新目前 selection 與 list 顯示。

## Implementation Contract

**Behavior**

- 選到 eligible node 時，使用者可直接從目前 selection surface 調整 layer。
- 選到 fixed-layout region 時，介面說明其層級由頁面模板固定，而不是默默不顯示 controls。
- 左側 list 與右側/畫布 layer actions 操作同一份排序資料。
- 若 selection 只是 effect-capable media source 而非 reorderable node，介面維持 effect authoring 或 unsupported explanation，但不誤顯示 z-order controls。

**Data / schema**

- authoring node 需要有明確的 reorderable eligibility 訊號，供 inspector 與 selection actions 判斷。
- 既有 freeform/shell ordering payload shape 保持相容，不新增無限制 z-index 欄位。

**Failure modes**

- 若使用者已選到可重排物件卻仍看不到 layer controls，視為未完成。
- 若 fixed-layout region 沒有 explanation，視為未完成。
- 若 list 與 inspector reorder 後順序不同步，視為重大 regression。
- 若 effect authoring support 與 z-order eligibility 被混成同一件事，導致 fixed-layout media surface 出現誤導性的 layer controls，視為未完成。

## Verification

- `apps/web/src/pages/DisplayPagesEditor/index.test.tsx` 驗證 freeform/object selection 下的 layer actions。
- `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx` 驗證 eligible 與 fixed-layout explanation state。
- `apps/web/src/pages/ShellDecorationEditor/index.test.tsx`、`objectList.test.tsx` 驗證 shell layer actions 與 object list 同步。

## Risks / Trade-offs

- [誤把固定模板區塊也做成可重排] -> 以 explicit eligibility 避免任意開放。
- [入口變多導致狀態不同步] -> 規定所有 controls 使用同一份 reorder command path。
- [使用者期待背景也能調 layer] -> 在 unsupported explanation 中清楚說明背景屬於固定 layout，而非 editor 遺漏功能。
