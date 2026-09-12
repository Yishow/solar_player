## Problem

UI 程式碼分析確認展示編輯器、播放設定、共用選單及趨勢圖存在操作結果與畫面承諾不一致：草稿可能被重載或晚到的儲存回應覆蓋，尚未完成初始載入即可產生無基線草稿，停用選單仍可變更，殼層已儲存卻仍標示 dirty，圖表刻度與單位不符。這些問題需要在後續效能重構前建立可驗證的正確行為基準。

## Root Cause

- DisplayPagesEditor 的 handleReload 直接呼叫會重建 session 的 reload，衝突提示卻聲稱重載保留草稿。
- useDisplayPageConfig 以 session 存在決定是否 hydration；applyConfigUpdate 可先建立 lastLoadedEnvelope 為 null 的 session。
- PlaybackSettings 的 formDisabled 未包含 isSaving，handleSave 成功後直接替換 settings/pages。
- CustomSelect 只對 trigger 停用，沒有完整鍵盤選取與停用期間事件阻擋；Device Fleet 對話框只有語意屬性，缺少焦點生命週期。
- 父層 shellDirty 比較首次 envelope，子層另持有最新已儲存內容。
- EnergyTrend 的圖形依資料最大值縮放，Y 軸標籤卻固定為百分比。

前次分析的 DOM/hook 實驗已重現提前編輯、選單方向鍵/Escape、展開後停用，以及對話框初始焦點問題；儲存覆蓋、衝突重載、殼層 dirty 與圖表問題以已回讀原始碼為依據，實作時先補行為回歸測試。不得把上述分析當成瀏覽器或 FHD 驗收。

## Proposed Solution

- 基線就緒前鎖定 draft 編輯，提供讀取失敗重試；明確確認捨棄後才重載遠端。
- 播放設定儲存期間鎖定表單、排序及重新同步；失敗保留草稿並解除鎖定。
- 保留 CustomSelect 外觀與呼叫介面，補鍵盤、標籤、焦點及完整 disabled 契約；用小型共用焦點生命週期支援 Fleet 對話框。
- 殼層 dirty 由實際可編輯內容與最近成功基線決定，父子顯示一致。
- 以共用 axis domain 計算趨勢座標與帶單位刻度，保留資料來源、缺值與彙總語意。

### New Capabilities

- `management-control-interaction-safety`: 管理選單與 Fleet 對話框的鍵盤、標籤、焦點及停用行為。

### Modified Capabilities

- `management-draft-save-concurrency`: 加入 draft 基線就緒與明確捨棄後重載契約。
- `display-editor-staged-loading`: 明確區分可見 seed fallback 與具備伺服器基線的可編輯草稿。
- `management-surface-draft-governance`: 播放設定儲存鎖定與殼層 dirty 一致性。
- `energy-monitoring-operator-workflows`: 趨勢刻度、單位及圖形 domain 一致性。

## Success Criteria

- 延遲 draft GET 期間操作不能建立無基線草稿；成功後可正常編輯儲存，失敗可重試。
- 衝突後取消重載保留草稿與復原歷程；確認捨棄後僅替換目標 page/stage，重載失敗保留本地內容。
- 播放設定儲存中不能新增輸入、排序或同步操作；成功/失敗均明確結束 pending。
- 選單鍵盤與 disabled 狀態符合規格；Fleet 對話框開啟、取消、關閉與 pending 的焦點可預測。
- 殼層儲存成功後父子 dirty 均清除，metadata 變化不造成誤報；真正未儲存內容仍受保護。
- 圖表的數值、座標與單位刻度相符，缺值不冒充成功零值。
- 新增 mounted interaction regressions、受影響測試、pnpm verify 與本次 FHD/browser evidence 完成；人工 acceptance 另行記錄。

## Impact

- Affected code:
  - Modified: apps/web/src/hooks/useDisplayPageConfig.ts
  - Modified: apps/web/src/hooks/useDisplayPageConfig.test.ts
  - Modified: apps/web/src/pages/DisplayPagesEditor/index.tsx
  - Modified: apps/web/src/pages/DisplayPagesEditor/EditorToolbar.tsx
  - Modified: apps/web/src/pages/ShellDecorationEditor/index.tsx
  - Modified: apps/web/src/pages/PlaybackSettings/index.tsx
  - Modified: apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - Modified: apps/web/src/components/management/CustomSelect.tsx
  - Modified: apps/web/src/components/management/CustomSelect.test.tsx
  - Modified: apps/web/src/pages/DeviceFleet/GroupEditDialog.tsx
  - Modified: apps/web/src/pages/DeviceFleet/PairingDialog.tsx
  - Modified: apps/web/src/pages/EnergyTrend/index.tsx
  - Modified: apps/web/src/pages/EnergyTrend/viewModel.ts
  - New: apps/web/src/components/management/useModalFocus.ts
  - New: apps/web/src/pages/DisplayPagesEditor/draftInteractionState.ts
  - New: apps/web/src/pages/DisplayPagesEditor/shellWorkspaceState.ts
  - New: apps/web/src/pages/EnergyTrend/chartModel.ts
- Tests: 受影響元件旁的 mounted tests 與上述新模組測試；確切 case 名稱及測試入口由 design/tasks 定義。
- API、SQLite schema、MQTT、部署及 production 資料無變更；不新增 UI 依賴。
