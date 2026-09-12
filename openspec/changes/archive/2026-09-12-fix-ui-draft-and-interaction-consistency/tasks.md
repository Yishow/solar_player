## 1. 展示頁草稿保護

- [x] 1.1 落實「草稿基線就緒與重載確認」中的 hook 邊界：Draft editing requires an authoritative initial baseline；Display editor draft config hydration avoids repeated full-object work；useDisplayPageConfig 在 cold/failed/reloading draft 狀態拒絕 mutation，並保留 page/stage/owner 屏障。新增 draftInteractionState 與 mounted draft-cold-edit-blocked、draft-load-failure-retry、draft-page-stage-isolation；跑 pnpm --filter @solar-display/web test src/hooks/useDisplayPageConfig.test.ts 及新 helper 測試。
- [x] 1.2 [after: 1.1] 完成「草稿基線就緒與重載確認」的 UI 接線：Discarding a dirty draft requires explicit confirmation；DisplayPagesEditor/EditorToolbar/實際 canvas-inspector 操作使用可編輯狀態，reload 必須經 dirty 捨棄確認。以 draft-discard-cancel、draft-discard-confirm、draft-discard-read-failure mounted tests 驗證取消/失敗保留內容及 undo，成功只替換目標 draft；最後重跑 1.1 測試。

## 2. 共用控制項

- [x] 2.1 實作「共用選單鍵盤與停用生命週期」的相容元件：Shared management selects support keyboard selection and accessible names；Disabling a shared select blocks every change path。CustomSelect 支援可選標籤介面與完整鍵盤/disabled 行為，維持原 props 及 shared classes；以 select-keyboard-selection、select-disabled-while-open、placeholder/empty/disabled-option mounted tests 驗證並跑 pnpm --filter @solar-display/web test src/components/management/CustomSelect.test.tsx。
- [x] 2.2 [after: 2.1] 將「共用選單鍵盤與停用生命週期」的標籤介面接到 CustomSelect 全部現行管理頁呼叫點；使用圖譜/rg 列出實際使用處逐一核對，覆蓋 PlaybackSettings、ImageManagement、AssetLibrary、CircuitSettings、MqttSettings、DataHub。以 select-labelled-at-use-sites 確認真實 trigger 有欄位名稱，移除以隱藏 select 存在當作無障礙證據的舊斷言；跑各受影響元件測試，保留值域與滑鼠行為。
- [x] 2.3 實作「Fleet 對話框焦點生命週期」：Fleet dialogs manage focus and dismissal over their lifecycle；加入 useModalFocus 後依序接入 GroupEditDialog/PairingDialog，保留現有 close/token clearing。以 fleet-dialog-focus-cycle、fleet-dialog-pending-escape 覆蓋 Tab/Shift+Tab、Escape、trigger 消失及無可 focus 子項；跑 DeviceFleet 元件/contracts 測試。

## 3. 儲存與狀態一致性

- [x] 3.1 [after: 2.2] 完成「播放設定儲存鎖定」：Playback settings prevent draft mutation while saving；PlaybackSettings 與 PlaybackSettingsFormSections 在 save pending 鎖定 setter、表單、resync、拖曳並停止 DurationStepper/useLongPressStepper timer。以 deferred responses 跑 playback-save-locks-input-and-sort、playback-save-stops-held-stepper、playback-save-failure-retains-draft、playback-partial-failure-keeps-lock-until-settled；驗證兩個寫入 settled 才解鎖、成功基線與失敗保留草稿，重跑共用選單相關 case。
- [x] 3.2 [after: 1.2] 完成「殼層草稿基線單一來源」：Embedded shell draft indicators share the latest saved content baseline；新增 shellWorkspaceState，遷移 DisplayPagesEditor 與 embedded ShellDecorationEditor，再移除首次 envelope JSON baseline。以 shell-parent-child-dirty-parity、shell-metadata-only-update、shell-asset-return-keeps-baseline mounted tests 驗證 save/load/failure 與素材往返，並驗證 standalone editor 與頁面 dirty 不受影響。

## 4. 趨勢圖判讀

- [x] 4.1 完成「趨勢圖共用數值座標與刻度」：Trend axes and curves share the same numeric domain；加入 chartModel 後接入 EnergyTrend 的 MiniTrendChart 與軸標籤，保留來源、彙總及缺值語意。以 trend-axis-shares-domain、trend-percent-40-of-100、trend-zero-and-missing 驗證 kW/kWh/t/%、超出百分比範圍、零值及空資料；跑 EnergyTrend viewModel 與元件測試。

## 5. 整合驗證與交接

- [x] 5.1 [after: 1.2, 2.2, 2.3, 3.1, 3.2, 4.1] 主代理回讀最後 diff、specs 與 mounted regression 結果，確認只有指定 UI 責任變更、沒有移除 cache/version/access gate。修正範圍內 findings 後跑全部受影響 web tests，記錄每個上述 case 的 PASS/FAIL/NOT RUN 與正式測試位置。
- [x] 5.2 [after: 5.1] 以整合後最後版本執行 pnpm verify、git diff --check、spectra analyze fix-ui-draft-and-interaction-consistency --json 與 spectra validate fix-ui-draft-and-interaction-consistency，保存實際結果；任何修正後重跑受影響檢查與最終 repo gate，不把文件驗證當作功能驗證。
- [x] 5.3 [after: 5.2] 使用隔離 fixture runtime 取得 keyboard、pending-save、conflict-discard、shell dirty、trend axes 的 browser evidence；依 docs/ops/fhd-closeout.md 執行 pnpm run fhd:witness -- --base-url <隔離測試服務網址>，建立 fresh witness batch、gap notes 與 docs/fhd-witness/evidence-template.md evidence bundle，確認 visual canonicals 與 launch witness gates 的限制；不宣稱正式裝置/部署已驗收。
- [x] 5.4 [after: 5.3] 將操作結果與 FHD intentional differences 提供使用者決定 acceptance，留下本案 diff/checkpoint 與未完成事項；只有實際取得必要 acceptance 才勾選，未取得維持待驗收。提供 optimize-ui-loading-and-render-work 可重現的修正後基線；不自行 commit。
