## Context

`Image Management` 現在同時承載 asset-level 欄位、playlist-facing metadata、asset health 與 display references。頁面雖然有整體 dirty feedback，但 save pipeline 只會針對目前 selected 的 asset 與其主要 playlist row 落盤，沒有處理 asset selection change 期間的 draft ownership。這使得管理頁在多張圖片連續編輯時出現靜默遺失修改的風險。

## Goals / Non-Goals

**Goals**

- 讓 `Image Management` 對「正在編輯哪一張圖、哪一筆 playlist row」有明確 draft ownership。
- 讓 asset selection change 不再靜默丟失上一張圖的未儲存修改。
- 讓 save feedback、dirty state 與實際持久化結果一致。
- 補齊 cross-selection regression tests。

**Non-Goals**

- 不重做整個 Image Management IA。
- 不把單頁編輯改成全圖庫 bulk save 工作流。
- 不改寫 image upload、cover asset、display reference 基礎流程。

## Decisions

### Keep one selected asset draft session authoritative

頁面一次只允許一個 authoritative draft session：目前 selected 的 asset 與其主要 playlist row 是唯一可提交的編輯目標。dirty state 也必須以這個 session 為主，而不是做成無法追溯到 persistence target 的全域訊號。

替代方案是保留全域 dirty 並嘗試在 save 時掃描所有本地差異，但這會把目前單頁編輯器推向隱性 bulk-save 模型，超出本 change 範圍。

### Guard selection changes until prior draft is resolved

當操作員從圖片 A 切到圖片 B，而 A 仍有未儲存修改時，系統必須先要求處理 A 的 draft，再允許切換，或明確保留該 draft 直到使用者做出決定。不得採用靜默丟棄。

替代方案是切換後只在 banner 提示「上一張未儲存」，但那仍無法保證使用者知道哪些欄位已丟失。

### Save and resync only the edited asset/entry pair

save path 應只提交 authoritative draft session 代表的 asset / playlist row，且成功後立刻以相同 selection 重新同步 server state。這能保證前端顯示的內容與真正持久化後的 payload 一致。

## Implementation Contract

- Behavior: 操作員在 `/settings/images` 編輯某張圖片後，若嘗試切到另一張圖片，系統 SHALL 要求處理目前 draft，或明確保留該 draft，而不是靜默遺失。
- Interface / data shape: `Image Management` 的本地狀態 SHALL 能把 dirty state 對應到單一 selected asset 與其對應 playlist row；save path SHALL 只提交該 pair 的 asset update 與 playlist entry update。
- Failure modes: 若 save 失敗，畫面 MUST 保留原 draft 與 error feedback；若重新同步失敗，不得把 draft 誤標成已儲存。
- Acceptance criteria: `apps/web/src/pages/ImageManagement/index.test.tsx` 與 `apps/web/src/pages/ImageManagement/viewModel.test.ts` SHALL 覆蓋 cross-selection draft handling、successful targeted save、save failure retains draft 等情境。
- Scope boundaries: 本 change 只處理 selection-safe draft 與 targeted persistence contract，不擴張成 multi-select、bulk save、或新的 playlist studio。

## Risks / Trade-offs

- [Risk] selection guard 太頻繁會增加操作摩擦 → Mitigation: 只在存在未儲存修改時阻擋或提示。
- [Risk] authoritative draft session 與目前 view model 欄位映射不一致 → Mitigation: 讓 dirty ownership 與 save payload 共用同一組 selected asset / playlist row 來源。
- [Risk] save 後重新同步若切錯 selection，仍可能顯示錯誤成功態 → Mitigation: 成功後以原 selection id 重新載入並核對存在性。
