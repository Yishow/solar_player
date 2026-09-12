# 第一案交接 Checkpoint

- Change：`fix-ui-draft-and-interaction-consistency`。
- 狀態：12/12 tasks 完成；2026-09-12 使用者「接受本案，畫面差距留待另案」。此 checkpoint 為 archive/commit 前的已驗收基線；第二案仍 parked，0/13 tasks。
- 使用者本輪已明確授權依序實作、code-review、fix、spectra-archive、spectra-commit；該授權取代 tasks 最末舊有「不自行 commit」的預設。取得限定範圍的必要 acceptance 後沿原授權繼續，不重問提交權限。
- 本案開始 HEAD：`f45da8d1bb6157d74e1f1c0b4a5c72a43f51b642`，開始工作樹乾淨。
- 工程成果：草稿就緒/捨棄重載、選單鍵盤/標籤/停用、Fleet 焦點、播放儲存鎖定、殼層基線與晚到回應保護、趨勢刻度/單位對齊。
- PASS：affected 683/683、完整 verify 3,122 passed / 2 skipped / 0 failed、browser 7/7、15 FHD + 6 管理頁截圖及 gap notes、code-review 最後無範圍內未解決 finding。詳見 `review.md` / `verification.md` / `witness.md`。
- 後續執行：archive、commit、第二案效能工作。畫面差距已由使用者決定留待另案。實體裝置/正式部署/完整 FHD launch acceptance 未驗證。
- Raw logs：`artifacts/ui-consistency/2026-09-12/`；browser raw evidence 與 PNG 路徑列在 `witness.md` / `witness-manifest.json`。這些本機產物不加入 commit。
- 回復依據：本案 current tracked diff 加完整 new-file patch 留於 `artifacts/ui-consistency/2026-09-12/checkpoint.patch`，SHA-256 另列同目錄 `checkpoint.sha256`。本次沒有修改既有 Git history 或正式資料。

## 下一案的正確行為基線

- `source-identity.json` 列出 41 個修改後程式/測試檔案 SHA-256、pnpm-lock SHA-256、Node v24.15.0 / pnpm 10.33.2。Git commit 完成後以實際第一案 commit 作效能比較的 base，不能拿更早缺陷版本比較。
- 可重跑：`rtk proxy pnpm verify`；browser 用 `witness.md` 的完整隔離命令。FHD mock 值/時鐘會動，重跑取得新 batch；這份圖不保證重複每個像素。
- 第一案未建立效能百分比。第二案先建立固定 fixture 與相同儀器、保存 cold/warm 各 5 次原始量測，再開始優化；baseline/candidate 需同環境/fixture 並保留 hash 與操作輸出相容證據。
- 依序：第一案接受範圍明確 → 完成 task 5.4 → verify completion → archive 預覽/執行 → 精準 commit → unpark 並實作 `optimize-ui-loading-and-render-work`。不得跳過第一案收尾提前實作第二案。

## 精準程式與測試範圍

以下 41 個檔案均為本案責任；其完整 bytes 對應 `source-identity.json`。另包含本 change 的 proposal/design/specs/tasks/review/verification/witness/checkpoint 及 JSON 證據摘要；archive 後只納入該交易實際產生的 archive/spec 路徑。

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

## 排除範圍

- `artifacts/` raw logs、scope snapshots、patch、browser screenshots 與 runtime 產物；即使 task baseline 自動收錄 logs 也只視為證據。
- `docs/fhd-witness/runs/` 的本機 PNG；已在本 change 保存路徑、hash、gap notes。
- 第二案 parked artifacts、其他 active changes 的檔案、全域指引與正式 runtime 資料。
- 尚未有 staging；未執行 archive transaction 或 Git commit。

## Archive transaction 結果

- 已封存為本目錄，5 份 delta specs 由 core 套用一次；12/12 tasks。
- 修正 archive 自動 @trace 混入其他歷史任務路徑的問題，僅保留各 requirement 的實際 source/test 引用；不改 requirement 行為。
- Cleanup warning：共享排序 metadata 的 SQLite 更新因 readonly database 未完成；archive/spec transaction 已成功，未重試 archive。
- Git commit 依本案精準路徑另執行，實際 commit hash 以 Git history 與交付回報為準。
