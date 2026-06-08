## 0. Design / spec traceability

對照 design.md decisions 與 spec requirements，確認 tasks 涵蓋無遺漏：

- Decision「Memoize MqttSettings viewModel and stabilize content handlers」→ tasks 1.1 / 1.2。
- Decision「Memoize TopicWorkspaceRow」→ task 1.3。
- Decision「Extract memoized CircuitRow component」→ tasks 2.1 / 2.2。
- Decision「Memoize PlaybackSettings viewModel and isolate per-second runtime」→ tasks 3.1 / 3.2。
- Requirement「Settings render output unchanged after memoization」→ 全部 task，驗於 4.1 / 4.2。
- Requirement「Settings save, test, and CRUD behavior preserved」→ tasks 1.x / 2.x / 3.x，驗於 4.2。
- Requirement「Polling and per-second tick update only affected subtrees」→ tasks 1.1–1.3 / 3.1–3.2，驗於 4.2。
- Requirement「Existing settings tests pass without modification」→ task 4.1。

## 1. MqttSettings

- [x] 1.1 [P] 在 `apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx` 把 `buildMqttSettingsViewModel(...)` 包進 `useMemo`（dependency 為實際輸入 props），並為 `MqttSettingsContent` 加 `React.memo`。完成標準：相同 props 下 viewModel 不重建、畫面輸出不變，既有 `MqttSettingsContent.test` 不需修改即通過。
- [x] 1.2 [P] 在 `apps/web/src/pages/MqttSettings/index.tsx` 把傳給 content 的 handler（settingChange、topicChange、testConnection、saveTopicMappings、reloadTopics、addTopicMapping、removeTopicMapping、saveSettings）以 `useCallback` 穩定化，dependency 精確。完成標準：5 秒 polling 進來時 handler reference 不變，save/test 送出正確值（瀏覽器 witness 驗證）。
- [x] 1.3 [P] 在 `apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx` 為 `TopicWorkspaceRow` 加 `React.memo`，並把 `renderInputGroup` 巢狀函式提取為穩定形式。完成標準：polling 後僅變動的 topic row 重繪，既有 `TopicWorkspaceRow.test` 通過。

## 2. CircuitSettings

- [x] 2.1 [P] 新增 `apps/web/src/pages/CircuitSettings/CircuitRow.tsx`，以 `React.memo` 承載單列迴路欄位（名稱、topic、threshold 等），DOM/style 與目前 `CircuitSettingsContent.tsx` 內單列輸出位元等價。完成標準：抽離後畫面不變，型別檢查通過。
- [x] 2.2 [P] 在 `apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx` 改用 `CircuitRow`，`handleFieldChange`/`handleDelete` 以 `useCallback` 穩定化並以 row id 為參數；既有 viewModel `useMemo` 不動。完成標準：編輯一格只重繪該列，新增/刪除/儲存與 dirty count 行為不變，既有 `CircuitSettingsContent.test` 通過。

## 3. PlaybackSettings

- [x] 3.1 [P] 在 `apps/web/src/pages/PlaybackSettings/index.tsx` 把 `buildPlaybackSettingsViewModel(...)` 包進 `useMemo`，並將每秒變動的 runtime 值（countdown/progress）與不變的 form 資料分離。完成標準：tick 不再重建整個 form viewModel，儲存讀取的是 form state，既有 PlaybackSettings 測試通過。
- [x] 3.2 [P] 在 `apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx` 為元件加 `React.memo`，並由父層只餵入每秒變動的 runtime 值作為穩定 prop。完成標準：每秒 tick 只重繪預覽列，周邊 form sections 不重繪。

## 4. Verification

- [x] 4.1 執行 `pnpm --filter @solar-display/web test`，驗證 spec requirement「Existing settings tests pass without modification」「Settings render output unchanged after memoization」：三頁既有測試全綠且未修改既有斷言。
- [x] 4.2 以 `agent-browser` 驗證 spec requirement「Settings save, test, and CRUD behavior preserved」與「Polling and per-second tick update only affected subtrees」：MqttSettings 觀察 5 秒 polling 更新、執行 test connection 與 topic mapping save（密碼顯示 `****`）；CircuitSettings 新增/編輯/刪除迴路並儲存、確認 dirty count 與單列重繪；PlaybackSettings 觀察 rotation 預覽每秒更新並儲存。皆與現狀一致。
