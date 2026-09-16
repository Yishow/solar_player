## 0. 跨發布端前置契約
- [x] 0.1 對齊最新 MQTT-OWNERSHIP、PUBLISH-TAG-REGISTER 與 G 的 KNE/EPR 工程契約，實作 DHC-R5（Broker editing is receiver scoped and upstream health stays independent），以對應 PM/KN 驗收案例證明責任不跨界。 <!-- covers: Broker editing is receiver scoped and upstream health stays independent, 更新決策與邊界 -->
- [x] 0.2 只修改Player receiver原則不變。工程報表到件依各自排程，與MQTT連線、publisher存活和DDE健康分開；未定排程顯示unknown。驗證 DHC-R5 及 G 對應情境。 <!-- covers: Broker editing is receiver scoped and upstream health stays independent, 更新決策與邊界 -->

## 1. 模型與合約
- [x] 1.1 定位目前 Connections controller，盤點 effective/candidate/test 三種資料來源（DHC-R1: Connections presents the central broker as infrastructure）。 <!-- covers: Connections presents the central broker as infrastructure, d2. 雙狀態與版本 -->
- [x] 1.2 建立 candidate revision 與 request correlation，機密不納入公開 hash（DHC-R3: Connection test results are bound to the tested candidate）。 <!-- covers: Connection test results are bound to the tested candidate, d2. 雙狀態與版本 -->
- [x] 1.3 確認 test client 隔離與有效設定優先序；缺少的 server evidence 使用 additive contract。 <!-- covers: Connection actions state their real side effects, d3. 共享影響與敏感欄位 -->

## 2. 介面與動作
- [x] 2.1 重組共享 Broker 摘要、設定與測試結果的視覺層級（d1. 操作優先版型）。 <!-- covers: Connections presents the central broker as infrastructure, d1. 操作優先版型 -->
- [x] 2.2 將 GET status 文案改為檢查，真測試使用既有 POST test（DHC-R2: Connection actions state their real side effects）。 <!-- covers: Connection actions state their real side effects, d1. 操作優先版型 -->
- [x] 2.3 建立設定變更時測試失效與晚到回應隔離（DHC-R3: Connection test results are bound to the tested candidate）。 <!-- covers: Connection test results are bound to the tested candidate, d2. 雙狀態與版本 -->
- [x] 2.4 建立 save review、儲存中、儲存待確認、已確認與 unknown recovery。 <!-- covers: Connection actions state their real side effects, d3. 共享影響與敏感欄位 -->
- [x] 2.5 建立 masked credential retain/replace/clear 控制（DHC-R1: Connections presents the central broker as infrastructure）。 <!-- covers: Connections presents the central broker as infrastructure, d3. 共享影響與敏感欄位 -->
- [x] 2.6 用共用 context link builder 取代無參數 anchor，接 dirty guard（DHC-R4: Connection diagnostics preserve task context and honest data mode）。 <!-- covers: Connection diagnostics preserve task context and honest data mode, d4. 連到下一步 -->
- [x] 2.7 明確顯示 mock、stale status 與缺證據層級（DHC-R4: Connection diagnostics preserve task context and honest data mode）。 <!-- covers: Connection diagnostics preserve task context and honest data mode, d1. 操作優先版型 -->

## 3. 驗收
- [x] 3.1 測 A 正式正常、B 草稿失敗、C 未測的同時狀態與 late response（DHC-R3: Connection test results are bound to the tested candidate）。 <!-- covers: Connection test results are bound to the tested candidate, d2. 雙狀態與版本 -->
- [x] 3.2 測 password 三態、環境覆寫、shared-scope review 和 KN 返回脈絡（DHC-R1, DHC-R4）。 <!-- covers: Connections presents the central broker as infrastructure, Connection diagnostics preserve task context and honest data mode, d4. 連到下一步 -->
- [x] 3.3 以 spy/隔離 Broker 驗證 test 無 save/publish/runtime disconnect 副作用（DHC-R2: Connection actions state their real side effects）。 <!-- covers: Connection actions state their real side effects, 更新決策與邊界 -->
- [x] 3.4 測不同 viewport、鍵盤順序與錯誤可讀性。 <!-- covers: d1. 操作優先版型 -->
- [x] 3.5 focused tests、最終 pnpm verify；runtime/Broker 驗證另列證據。 <!-- covers: 更新決策與邊界 -->
