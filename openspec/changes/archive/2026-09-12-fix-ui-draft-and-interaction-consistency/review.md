# Code review

固定基線 `f45da8d1bb6157d74e1f1c0b4a5c72a43f51b642` 到目前工作樹；沒有中間 commit。

- Spectra snapshot：`f9bc0c688d626e6d4904e020889d07c8853b6690`，`touched_tracking` / `resolved`，37 個檔案，limitations 為空。
- 另有 4 個明確屬本案、於整合 task 歸屬的檔案：Weather.test.tsx、trend.css、activeSurfaceRecompute.test.ts、tests/browser/ui-interactions.spec.ts；review 時以內容 SHA256 補充，最後確認全部未變。
- `spectra scope --check-snapshot` 回傳 `current`；capture 與補充 hash 保存在 `artifacts/ui-consistency/2026-09-12/`。
- 標準：AGENTS.md、docs/ops/conventions.md。意圖：本案 proposal/design/tasks 及 5 份 delta specs。
- 主代理回讀 source、diff、tests，檢查 correctness、efficiency、reuse/simplification、conventions；兩位 Luna reader 分別提供 Standards / Spec 軸唯讀證據，最後由主代理處置與驗證。

## Standards

最後未解決 findings：Critical 0 / Warning 0 / Suggestion 0。

Shell 的 dirty 計算曾在整合時移除既有 memo；主代理已恢復 child memo，parent 依 workspace state memo。未引入無關效能重構。

## Spec

初次補查有 1 Warning：較早的 shell save/publish 回應在素材工作區往返後覆寫新草稿。主代理確認並修正：比較 submitted/current channel，保留較晚修改、更新 saved baseline 與下次 baseVersion，拒絕較舊版本回應。2 個純函式與 2 個 mounted regression 先失敗，再通過；reader 最後回讀確認已解決。

最後未解決 findings：Critical 0 / Warning 0。

## 執行證據與限制

- 主代理最後跑 94 個受影響 web test files，683/683 PASS；raw output 在 `artifacts/ui-consistency/2026-09-12/affected-tests.log`。
- Reader 的結論不當作測試 PASS；repo gate、fresh browser/FHD、人工 acceptance 的最新狀態見 verification.md。
- 本 review 不宣稱 deployment、正式裝置或 launch acceptance。

## 已審查的程式與測試範圍

- `apps/web/src/components/management/CustomSelect.interaction.test.tsx`
- `apps/web/src/components/management/CustomSelect.tsx`
- `apps/web/src/components/management/CustomSelect.useSites.test.ts`
- `apps/web/src/components/management/useModalFocus.ts`
- `apps/web/src/hooks/useDisplayPageConfig.test.ts`
- `apps/web/src/hooks/useDisplayPageConfig.ts`
- `apps/web/src/pages/AssetLibrary/index.tsx`
- `apps/web/src/pages/CircuitSettings/CircuitRow.tsx`
- `apps/web/src/pages/DataHub/Weather.test.tsx`
- `apps/web/src/pages/DataHub/WeatherCards.tsx`
- `apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx`
- `apps/web/src/pages/DeviceFleet/GroupEditDialog.tsx`
- `apps/web/src/pages/DeviceFleet/PairingDialog.tsx`
- `apps/web/src/pages/DeviceFleet/dialogFocus.test.tsx`
- `apps/web/src/pages/DisplayPagesEditor/EditorToolbar.test.tsx`
- `apps/web/src/pages/DisplayPagesEditor/EditorToolbar.tsx`
- `apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts`
- `apps/web/src/pages/DisplayPagesEditor/canvasPane.tsx`
- `apps/web/src/pages/DisplayPagesEditor/draftInteraction.test.tsx`
- `apps/web/src/pages/DisplayPagesEditor/draftInteractionState.test.ts`
- `apps/web/src/pages/DisplayPagesEditor/draftInteractionState.ts`
- `apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx`
- `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`
- `apps/web/src/pages/DisplayPagesEditor/index.tsx`
- `apps/web/src/pages/DisplayPagesEditor/shellWorkspaceState.test.ts`
- `apps/web/src/pages/DisplayPagesEditor/shellWorkspaceState.ts`
- `apps/web/src/pages/EnergyTrend/chartModel.test.ts`
- `apps/web/src/pages/EnergyTrend/chartModel.ts`
- `apps/web/src/pages/EnergyTrend/chartRendering.test.tsx`
- `apps/web/src/pages/EnergyTrend/index.tsx`
- `apps/web/src/pages/EnergyTrend/trend.css`
- `apps/web/src/pages/ImageManagement/ImageManagementContent.tsx`
- `apps/web/src/pages/MqttSettings/MqttWeatherPanel.tsx`
- `apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx`
- `apps/web/src/pages/PlaybackSettings/index.tsx`
- `apps/web/src/pages/PlaybackSettings/interaction.test.tsx`
- `apps/web/src/pages/ShellDecorationEditor/index.test.tsx`
- `apps/web/src/pages/ShellDecorationEditor/index.tsx`
- `apps/web/src/pages/ShellDecorationEditor/shellWorkspaceState.interaction.test.tsx`
- `apps/web/src/styles/management.css`
- `tests/browser/ui-interactions.spec.ts`
