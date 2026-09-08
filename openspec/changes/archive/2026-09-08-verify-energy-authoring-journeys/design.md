# Design｜整合用電正確性、資料接入、展示發布與回退驗收

## Context

repo要求pnpm verify、fresh FHD witness、使用者視覺acceptance後才可archive；自動測試或舊截圖不是部署與上線驗收。此change只負責跨領域驗證与交接，不吞入其他change的功能實作。

## Goals / Non-Goals

**In scope**：建立可重現CL/KN、日/月/年、reset/gap、zero/stale、UI/發布/並行修改的整合fixtures与journey tests；交付逐項證據、修復清單、部署回退runbook与source-to-screen對帳。

**Out of scope**：不取代前10個change的unit tests，不把未驗證的功能標完成，不做未授權生产重算或發布，不用mock填補生產歷史。

## Dependencies

E4 / fix-overview-monthly-consumption、E5 / fix-department-energy-shares、E6 / add-site-energy-accounting-profiles、U1 / refactor-data-hub-task-workspace、U2 / add-guided-data-source-onboarding、U3 / refactor-display-editor-workspace、U4 / add-unsaved-binding-preview、U5 / unify-display-publish-preflight、U6 / add-guided-site-energy-setup

所有新介面都必須在 shared 型別、server 驗證、呼叫端與測試之間一致。未知現場單位、採樣頻率與既有來源身分不可靠名稱猜測。

## Decisions

### D1. 測試隔離

使用隔離SQLite與測試broker/HTTP stub，明確fixture標記，不將sample寫正式資料。backend注入now和TZ；測CL/KN同key不串，真实MQTT模式不得自動啟用mock。

### D2. 完整journey

J1新KN累積來源→讀值→day/month/year→卡片未儲存預覽→save/check/publish；J2首頁當月gap/zero/error与scope切換；J3部門250/150/100→50/30/20及缺錶/重複mapping；J4remote版本衝突與無裝置ack。

### D3. 資料對帳

同一fixture的E2 service、E3 API、EnergyTrend/History、Overview、FactoryCircuit、editor preview、published runtime都對同一expected values与quality，不只比較畫面上的字串。各query能追到source sample ids/algorithm revision。

### D4. 視覺與操作

管理桌面1366x768/1440x900/1920x1080；playback五頁1920x1080 fresh witness。保護原canonical風格、共享chrome、geometry与清晰缺值；human acceptance是獨立欄位。

### D5. 安全回退

在測試備份資料上dry-run→activate→rollback，確認原始samples不變、只換active revision、歷史缺基準仍unknown；dependency order與不能並改的shared files寫入runbook。

### D6. 完成證據

每項記錄run id、main SHA、command、exit code、fixture、screenshot/gap notes、actual result及reviewer；所有issue回到擁有其契約的change修，不以Q1臨時hardcode遮掩。

## API / Data / State Contracts

J1-J4用實際HTTP/UI contracts，不直接改React state跳過驗證；測試資料可使用本包fixtures作輸入但需經正式ingestion/resolver。runbook列source-review、backfill、scope activation、monitoring、rollback、offline acknowledgment解讀。

錯誤回應保留既有管理／播放權限邊界；新增錯誤提供穩定 code、可理解訊息與可定位的欄位或 item。缺資料用 null＋品質，不以空字串、NaN 或 0 掩蓋。未識別的 scope、meter、page 或 item 不自動改成 CL。

## Migration and Rollout

合併依賴與targeted tests後，先測試環境、再由使用者核准小範圍現場驗收。任何數值口徑/廠區混用/假applied/資料遺失為release blocker。完成auto驗證不等於可以自动部署。

改動採 additive 相容策略；migration 編號與既有型別細節於 apply 對照最新 main，不能依文件預占流水號。任何重算須以副本 dry-run 和差異報告先驗證，正式資料套用另行授權。

## Risks / Trade-offs

沒有現場payload與裝置回報時只能完成合成fixtures驗證，現場acceptance必須保持pending。不能以格式驗證取代pnpm verify，也不能自動勾human acceptance。

## Verification Strategy

同目錄 test-plan 是 requirement-to-scenario 驗證對照；具體觀測條件以 specs 的 WHEN / THEN 為準。先寫失敗測試，再實作，再跑 regression。不得只修改 test expectation 讓既有錯誤數字通過。

## Source of Progress and Closeout

只有同目錄 tasks.md 的 checkbox 表示本 change 的實作進度。本包全部未勾選；格式檢查或公式 fixture 通過不代表應用程式測試通過。待實作後保存實際命令輸出、review findings 與必要 FHD witness；使用者驗收及 archive/commit 規則依 repo 現行 workflow。

## V2 Site-Setup Contract

End-to-end acceptance SHALL complete U6 initial setup and direct denominator edit with at least three unfamiliar representative operators, using only task goals and prepared sources. Evidence SHALL cover main or parallel-main totals, multi-meter department numerators, independent CL/KN bases, duplicate recovery, missing baselines, and profile-vs-page side effects. Four logical setup screens and zero required formula/key input are release criteria, not measured claims until tested.

規劃中的來源定義唯一放在E6 profile；操作入口由U6承接。詳見 `add-site-energy-accounting-profiles` 與 `add-guided-site-energy-setup` change。新增需求：Q1-R6。

## V3 MQTT Source Integration

新增Q1-R7：以M1/M2補齊來源探索→穩定tag選擇→批次preview/apply。此change維持原有單一權責，UI不再要求先到外部client查訂閱/publish後手抄Topic。M1/M2為新的前置/整合契約，不代表功能已在main。
