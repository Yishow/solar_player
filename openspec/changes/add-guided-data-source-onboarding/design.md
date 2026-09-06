# Design｜資料接入導引、累積電錶設定與安全測試

## Context

Sources/SourceCards已有新增、修改、刪除與真正publish API；新增預設custom.metric、cl、kW及$.value。此change沿用可用協定，只補工作順序、資料驗證與安全保存。

## Goals / Non-Goals

**In scope**：以「選廠區與來源→確認連線→選數值欄位與量測種類→確認結果並保存」建立可返回、不丟草稿的導引，熟手可走精簡直接編輯。解析測試唯讀，真正MQTT publish獨立且需確認。

**Out of scope**：不增加任意HTTP/Modbus等未支援connector、不允許改managed Solar ownership、不把成功連線誤稱資料已正確；不自動修改正式頁面綁定。

## Dependencies

E1 / add-meter-reading-contracts、U1 / refactor-data-hub-task-workspace、M1 / add-mqtt-observation-catalog、M2 / add-guided-mqtt-tag-mapping

所有新介面都必須在 shared 型別、server 驗證、呼叫端與測試之間一致。未知現場單位、採樣頻率與既有來源身分不可靠名稱猜測。

## Decisions

### D1. 任務階段與熟手捷徑

來源種類僅支援當前已有managed Solar、自訂MQTT、既有天氣設定連結。系統來源僅選用/檢查，不假裝可新建adapter。一般編排涵蓋scope、broker確認、取值與保存四種責任，不強制四張表。MQTT已授權連線/範圍採M2「找資料→選欄位/tag與確認語意/用途→預覽套用」三階段；已知的scope和broker不重問。

### D2. 樣本選取

MQTT以M1候選及M2 selector engine為依據；JSON field/tag點選產生受限selector。舊valuePath由相容層解析，不提供server未支援的JSONPath語法。未收到資料可在原位貼有限樣本並標離線範例，不能顯示來源online。M2支援的tag/array與lossless decimal不在U2重複實作。

### D3. 電錶設定

明確問「這個數字是累積電錶讀數、每段用量，還是瞬時功率？」選cumulative-energy顯示兩筆樣本相減、日/月/年基準說明，收集E1 meterId、role、unit/multiplier與cadence。只有一筆時仍可保存来源，但標等待基準不能預覽期間用量。

### D4. 三種測試分離

連線測試只確認broker；解析預覽不寫topic/live/history；真MQTT測試發送列出broker、topic、scope、metric、值、是否影響正式資料，需二次確認且延用寫入權限。不得在production透過「預覽」假按鈕發訊息；禁止預設retained測試。

### D5. 保存與影響

source save需server驗證unique(scope,key)、ownership與version。單筆PATCH可新增在既有settings-mqtt route模組，舊全量PUT仍做安全相容；409保留使用者draft并提供diff/reload。刪除/改身份先列draft/live/derived references，未知impact不當0。

### D6. 結果與下一步

保存成功顯示中文名、scope、最新值/等待基準、資料種類和「放到展示頁」。handoff只傳metric identity與opaque origin context，U4承接相容目標與返回，不自动新增實體畫面。敏感payload/密碼不放URL或localStorage。

### D7. 輸入行為

數字欄位編輯期保留字串，空白/非法值不偷偷變1。energy倍率>0；0被拒要顯示原因。step返回與連線失敗不清除已填內容。取消重試不能重複新增來源。

### D8. mapping寫入契約

新增單筆PATCH /api/settings/mqtt/topics/:mappingId，body={expectedSourceRevision,patch}；new source使用具idempotencyKey的POST到同collection，刪除採expectedSourceRevision與impact確認。MQTT preview/批次寫入委派M2 canonical APIs，payload採M1/M2有限256KiB設計與遮罩規則；單筆相容mutation保留，但selector-aware欄位不能被舊全量PUT清除。來源定義與topic mapping須在同transaction保持一致。400/422為field errors，409保留draft；未知id404，無權限沿用既有拒絕語意。

## API / Data / State Contracts

一般preview orchestration對MQTT使用M2 POST /api/settings/mqtt/mapping-drafts/preview，不另建不同parser的preview endpoint。response列selected/normalized value、measurementKind、issues與origin；source mutation回sourceRevision並刷新同一份來源清冊，保留單筆legacy adapter。

錯誤回應保留既有管理／播放權限邊界；新增錯誤提供穩定 code、可理解訊息與可定位的欄位或 item。缺資料用 null＋品質，不以空字串、NaN 或 0 掩蓋。未識別的 scope、meter、page 或 item 不自動改成 CL。

## Migration and Rollout

先上純parser preview與draft tests，再提供wizard入口；direct edit仍可用並共用validation。寫入mutation版本導入前保留舊API，但不能在scope過濾後整包覆蓋。

改動採 additive 相容策略；migration 編號與既有型別細節於 apply 對照最新 main，不能依文件預占流水號。任何重算須以副本 dry-run 和差異報告先驗證，正式資料套用另行授權。

## Risks / Trade-offs

payload可能帶機密；只能顯示最小範例且遮罩。測試publish會影響真實來源，必須與唯讀preview完全不同路徑。現場量測kind不明時暫存draft而非自動猜測。

## Verification Strategy

同目錄 test-plan 是 requirement-to-scenario 驗證對照；具體觀測條件以 specs 的 WHEN / THEN 為準。先寫失敗測試，再實作，再跑 regression。不得只修改 test expectation 讓既有錯誤數字通過。

## Source of Progress and Closeout

只有同目錄 tasks.md 的 checkbox 表示本 change 的實作進度。本包全部未勾選；格式檢查或公式 fixture 通過不代表應用程式測試通過。待實作後保存實際命令輸出、review findings 與必要 FHD witness；使用者驗收及 archive/commit 規則依 repo 現行 workflow。

## V2 Site-Setup Contract

When invoked by U6, onboarding SHALL inherit the concrete site and target field and return its eligible source reference to that field. Normal confirmed-source operation SHALL generate technical identities and mapping paths where supported; unreviewed legacy source semantics SHALL have an inline review path. Additional connector setup is distinct from the four-screen ready-source task.

來源身分/讀值由E1及來源registry保存；總量/部門/比較基準由E6 profile唯一保存；操作入口由U6承接。詳見 `add-site-energy-accounting-profiles` 與 `add-guided-site-energy-setup` change。新增需求：U2-R7。

## V3 MQTT Source Integration

新增U2-R8：以M1/M2補齊來源探索→穩定tag選擇→批次preview/apply。此change維持原有單一權責，UI不再要求先到外部client查訂閱/publish後手抄Topic。M1/M2為新的前置/整合契約，不代表功能已在main。

MQTT有既有連線及已批准範圍時，三階段M2任務取代原generic四step UI；source setup orchestration仍由U2，received-data與batch selector由M1/M2，不建兩套精靈。

V3 parser邊界：支援的tag filter/array record selector由M2新增shared contract及production engine，不在UI假裝舊PayloadParser已支援；既有語法以compatibility adapter保留。
