## Context

需求來自本次 UI 程式碼分析與使用者要求起草改善提案。已回讀的責任包括 useDisplayPageConfig 的 hydration/save/reload、DisplayPagesEditor 的工作區及衝突提示、PlaybackSettings 的 handleSave/formDisabled、CustomSelect、Fleet 對話框、ShellDecorationEditor 的 dirty 基線，以及 EnergyTrend 的 MiniTrendChart。

既有 stage/page cache 版本屏障、儲存衝突保留本地變更、管理頁 access gate 與 FHD 畫布均是應保留的契約。前次分析的重現紀錄不是實作完成證據；每項修正仍須有最後版本回歸測試。

## Goals / Non-Goals

**Goals:**
- In scope：本提案列出的草稿保護、pending 狀態、選單及 Fleet 對話框互動、殼層 dirty 提示、趨勢刻度。
- 將草稿互動判斷、殼層草稿/基線狀態與圖表 domain 分到可獨立測試的小模組，入口只負責接線。
- 建立後續 optimize-ui-loading-and-render-work 可沿用的正確行為基準。

**Non-Goals:**
- Out of scope：效能重構、全站改版、管理頁響應式、播放頁 FHD polish、圖表資料來源修正、跨路由持久化草稿、SVG 上傳、其他設定頁整改。
- 不修改 server API、DB schema、MQTT、配對授權、同步 scope、正式部署與本次以外的 WIP。
- 不引入 UI framework、通用全域 state store 或全站 dialog 管理器。

## Decisions

### 草稿基線就緒與重載確認

在 useDisplayPageConfig 對 enabled draft session 提供明確可編輯狀態，判斷需要有效 lastLoadedEnvelope 且沒有初始載入/已確認重載中的作業。setConfig/applyConfigUpdate/reset/undo/redo 的實際入口均遵守相同 gate，不能只灰化按鈕。live hydration 的現行行為不變。載入失敗允許重試；重試成功後解除 gate。

reload 接受明確 discardLocalChanges 選項；dirty draft 未明確要求捨棄時不啟動破壞性重載。UI 使用清楚的原生確認對話框，取消不改內容、歷程或 page/stage；確認後才呼叫 reload({ discardLocalChanges: true })。重載 pending 期間不可新增 draft mutation，失敗仍保留原草稿。不用另造比較/merge 工作台。設計介面以行為為準，將判斷放在 draftInteractionState；保留既有 save 回應版本屏障及 conflict rebase。

### 共用選單鍵盤與停用生命週期

維持 CustomSelect 外觀與 value/onChange/options 相容介面，新增可選 id/aria-label/aria-labelledby 入口並更新全部現行呼叫點。保留自訂選單以避免本提案引入原生 popup 的視覺差異；以 select-only combobox/listbox 模式補 active option、aria-controls、方向鍵、Home/End、Enter/Space、Escape、Tab 離開及焦點還原，跳過停用項目。字首查找納入鍵盤測試。

disabled 改變時關閉 popup，選項處理器及隱藏 native change 路徑都不得呼叫 onChange；無可用選項時不得假造值。隱藏 select 不作為無障礙驗收依據。變更事件的值域、placeholder、現有 CSS class 與滑鼠行為維持相容。

### Fleet 對話框焦點生命週期

新增 useModalFocus，只供 GroupEditDialog 與 PairingDialog 使用。開啟將焦點移入可用欄位/非破壞性按鈕，Tab/Shift+Tab 留在對話框；沒有可用子控制項時聚焦 dialog。關閉還原 trigger，trigger 已移除時回到 Fleet 合理容器。非 pending 的 Escape 呼叫既有 onClose；mutationPending 時不取消進行中的操作，焦點仍留在 dialog。清除 pairing token 與授權行為沿用既有 onClose，不另設替代關閉路徑。相較改成全站 dialog framework，此 hook 範圍更小。

### 播放設定儲存鎖定

將 isSaving 納入 formDisabled；同步鎖住 resync、drag 開始/經過/drop 與所有 setter。DurationStepper/useLongPressStepper 在 disabled 轉換時清除既有長按 timer；已開始的 drag 也不能在儲存期間變更順序。防止重複送出。成功使用回應作基線；兩個寫入請求全部 settled 後才解除鎖定；任一失敗保留本地內容與 dirty 基線，不宣稱成功。不能因 Promise.all 提早 reject 而在另一請求仍執行時允許重送；可用 allSettled 彙整結果，不增加後端交易。既有兩個 API 的原子性不在本案改動範圍，部分成功不嘗試新增回滾 API。

### 殼層草稿基線單一來源

以 shellWorkspaceState 管理目前 draft 與最近成功的 saved channel，供父層及 embedded ShellDecorationEditor 共用；保留 standalone editor 行為。dirty 比較 headerObjects/footerObjects 的可編輯 payload，不比較 version、updatedAt、publishedAt 等 metadata。成功 hydration/save 更新基線，失敗不更新；素材工作區往返保留 draft 及基線。移除父層首次 JSON baseline；不在每個父 render 重新序列化整份 envelope。殼層基線與頁面基線隔離。

### 趨勢圖共用數值座標與刻度

新增純函式 chartModel，輸入原有 chartPoints 與 unitLabel，輸出 domain、ticks 與座標所需參數；MiniTrendChart 與軸文字共用輸出。一般數值以包含零與實際有限數值的 domain 顯示，全部零值使用非零跨度供計算；缺值維持空態。百分比至少覆蓋 0 到 100，超出範圍的既有數值擴展 domain 顯示，不靜默 clamp。範例 fixture 的 40% 點對應 0–100 domain 的四成高度，不能在最高刻度冒充 100%。保留原資料來源、彙總、缺值過濾及時間點排序；不在此改 kW/kWh 來源映射。

## Implementation Contract

- 介面：reload 的明確 discard 選項、draft 可編輯狀態、CustomSelect 的可存取名稱、useModalFocus 與 shell workspace state；新增選項保持既有合法 caller 相容。
- 失敗：cold GET、force reload、save/conflict 都要能顯示原因及重試；失敗不清除有用草稿。pending 時重複操作不另發 mutation。
- 回歸 case 名稱：
  - draft-cold-edit-blocked、draft-load-failure-retry、draft-discard-cancel、draft-discard-confirm、draft-discard-read-failure、draft-page-stage-isolation。
  - playback-save-locks-input-and-sort、playback-save-stops-held-stepper、playback-save-failure-retains-draft。
  - select-keyboard-selection、select-disabled-while-open、select-labelled-at-use-sites、fleet-dialog-focus-cycle、fleet-dialog-pending-escape。
  - shell-parent-child-dirty-parity、shell-metadata-only-update、shell-asset-return-keeps-baseline。
  - trend-axis-shares-domain、trend-percent-40-of-100、trend-zero-and-missing。
- 測試需掛載真實 React 元件/hook 並控制 deferred API 回應；不能僅以讀檔 regex 或 helper 模仿取代操作證據。保留既有版本屏障測試，逐案只調整本次已明確改變的互動/刻度斷言。
- 每批執行 affected tests；最後以 pnpm verify 驗證整合版本。browser witness 覆蓋 Keyboard、save pending、conflict reload、shell save 與 trend axes；以隔離 fixture 服務執行，不連正式 broker/裝置。
- 依 docs/ops/fhd-closeout.md 跑 pnpm run fhd:witness -- --base-url <隔離測試服務網址>，使用 fresh witness batch、visual canonicals、gap notes 與 docs/fhd-witness/evidence-template.md evidence bundle；人工 intentional difference/launch acceptance 另記，不冒認完成。
- 這是缺陷修正，圖表刻度與互動語意的明確改變不受舊的「純效能最佳化輸出不變」限制；後續效能提案以本案結果作比較基線。

## Risks / Trade-offs

- 儲存期間暫停播放設定編輯 → 換取不遺失輸入的簡單契約；長時間 pending 明示狀態，失敗可重試。
- 共用選單涵蓋多頁 → 先加入相容介面與元件測試，再分批接線各使用頁，最後移除失效語意與舊斷言；不順手整理鄰近 CSS。
- draft hook 已含版本/owner 屏障 → gate 不可取代它們，cold/reload/save/remount 測試須共同通過。
- metadata 更新與素材往返可能重設殼層 → 將 draft/baseline 一起由工作區保存，避免僅同步 dirty 布林。
- 本次尚未量測效能增益 → 不提供改善百分比；效能由後續獨立提案驗證。
