# Design｜把 DataHub 整理成任務入口與一致廠區工作區

## Context

DataHub/index 提供all/cl/kn/global管理scope；Sources新增mapping卻固定cl，source內容與上方scope未透過同一state model約束。Connections已有status/test/save；應保留而不是重寫broker。

## Goals / Non-Goals

**In scope**：保留現有四個專業頁與相容網址，增加任務首頁「接入新資料／修改現有資料／排除資料異常」。建立共用scope模型、摘要列表與詳細編輯抽屜，工程細節只在需要時展開。

**Out of scope**：不重建MQTT broker、不增加每廠區broker、不加入任意新資料協定、不在UI重算用電、不重寫展示頁外觀；不拿management scope取代binding scope或preview context。

## Dependencies

無；可以先開始。

所有新介面都必須在 shared 型別、server 驗證、呼叫端與測試之間一致。未知現場單位、採樣頻率與既有來源身分不可靠名稱猜測。

## Decisions

### D1. 資訊架構

管理導覽顯示「資料中心」，route仍使用/settings/data-hub。root改為任務首頁；connections/sources/metrics/external保留可直達。中文labels：連線設定、接收與轉換、可用數據、天氣／外部資料；術語保留於details。

### D2. 單一scope來源

管理範圍使用URL state並通過共用parser；只有all/cl/kn/global合法。cl/kn新增時自動帶該廠區，all要求選擇；global新增通用非實體指標才可用，實體電錶必選廠區。來源及指標篩選、計數、狀態摘要都同scope。

### D3. 共用設定不是廠區設定

中央broker與既有共用weather配置標「全系統共用」。切KN不讓operator誤以為改broker只影響KN。scope對共用頁不適用時鎖定/說明，不暗中更改共用資料。

### D4. 列表先行

來源摘要列顯示中文名、廠區、量測類型、目前值、單位、最後更新、健康狀態、使用中頁面數。搜尋name/key/topic；篩選異常/託管/自訂；一次只開一個編輯抽屜，來源多時分頁或windowing。

### D5. 避免scope刪資料

列表可依scope過濾，但現有全量PUT topics不可把過濾後集合當完整存檔。以完整版本讀模型合併修改、或在U2提供row-level PATCH；無論如何保存KN不能刪CL。

### D6. 保護草稿

drawer有dirty/validation/error/保存成功；切scope、切任務、關頁、refresh前都保留或確認捨棄。remote live觀察更新與editable draft分離，避免新讀值覆蓋輸入。

### D7. 視覺規則

內容字級初始14px、欄位label至少13px、常用點按target建議40px；紅黃綠皆附文字/icon。用原design tokens，不增加第二套外觀主題。1366/1440/1920寬與鍵盤可操作。

## API / Data / State Contracts

DataHubWorkspaceContext僅代表managementScope/search/filter/selection；不写DisplayDataBinding。導向U2時只傳非敏感scope與source kind。狀態摘要優先 reuse既有metrics/source models，無資料清楚顯示而不是總數0當正常。

錯誤回應保留既有管理／播放權限邊界；新增錯誤提供穩定 code、可理解訊息與可定位的欄位或 item。缺資料用 null＋品質，不以空字串、NaN 或 0 掩蓋。未識別的 scope、meter、page 或 item 不自動改成 CL。

## Migration and Rollout

先落共用scope與legacy route tests，再切任務首頁及列表。原四個專業route一直可用，方便熟手和回退；不用一次搬所有功能。

改動採 additive 相容策略；migration 編號與既有型別細節於 apply 對照最新 main，不能依文件預占流水號。任何重算須以副本 dry-run 和差異報告先驗證，正式資料套用另行授權。

## Risks / Trade-offs

最容易的資料遺失風險是scope篩選後全量PUT；此項列為release blocker。首頁摘要計數若混用不同scope會誤導，必須由同一model衍生。

## Verification Strategy

同目錄 test-plan 是 requirement-to-scenario 驗證對照；具體觀測條件以 specs 的 WHEN / THEN 為準。先寫失敗測試，再實作，再跑 regression。不得只修改 test expectation 讓既有錯誤數字通過。

## Source of Progress and Closeout

只有同目錄 tasks.md 的 checkbox 表示本 change 的實作進度。本包全部未勾選；格式檢查或公式 fixture 通過不代表應用程式測試通過。待實作後保存實際命令輸出、review findings 與必要 FHD witness；使用者驗收及 archive/commit 規則依 repo 現行 workflow。

## V2 Site-Setup Contract

DataHub SHALL provide the 廠區用電設定 task with CL/KN completion and data-readiness summaries. It SHALL link to one U6 surface instead of creating independent total/numerator/denominator forms. An all-sites context SHALL prompt explicit site selection and playback visibility SHALL not hide site accounting settings.

規劃中的來源定義唯一放在E6 profile；操作入口由U6承接。詳見 `add-site-energy-accounting-profiles` 與 `add-guided-site-energy-setup` change。新增需求：U1-R7。

## V3 MQTT Source Integration

新增U1-R8：以M1/M2補齊來源探索→穩定tag選擇→批次preview/apply。此change維持原有單一權責，UI不再要求先到外部client查訂閱/publish後手抄Topic。M1/M2為新的前置/整合契約，不代表功能已在main。
