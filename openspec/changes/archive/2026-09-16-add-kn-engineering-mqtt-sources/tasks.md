## 1. 可獨立驗證的工程來源切片
- [x] 1.1 建立八工程 registry 與 sourceKind=engineering 型別／驗證；不需要 meterId/Item；錯別名、跨廠及未選 mode 有具體錯誤（對應 Engineering identity is independent of physical acquisition、Measurement mode is explicit and preserves topic meaning、G1. 主體與唯一正式來源、G3. 三種資料模式）。
- [x] 1.2 [after: 1.1] 加入共用 bounded gate 與三模式合約；preview/production 拒絕錯 schema、重複 JSON key、錯單位及 exampleOnly，無 fallback（對應 Engineering validation precedes generic fallback and binds review、Daily reports carry complete period evidence rather than meter baselines、Daily delivery recovery is bounded and separate from discovery、G4. 預覽、啟用與 runtime 同一套守衛）。
- [x] 1.3 [after: 1.2] 加工程來源 preview/apply、版本／policy token、exact-topic owner union；停一工程及 capture 不影響其他工程/Solar（對應 Engineering subscription intent preserves independent owners、Engineering validation precedes generic fallback and binds review、Source authority and migration are versioned without duplicating results、G2. 發布與訂閱）。
- [x] 1.4 [after: 1.3] 完成工程 power/counter 的端到端種類分流，測晚到功率、1000→1120、definition改版與reset；不造meter rows（對應 Power and engineering counters retain observation semantics）。

## 2. 工程日報切片
- [x] 2.1 [after: 1.2] 建立日報儲存／current pointer與來源／日曆effective validation；測單一final日量、真0、錯日界、過去/未來期間（對應 Daily reports carry complete period evidence rather than meter baselines、G5. 報表身分與更正）。
- [x] 2.2 [after: 2.1] 原子處理重送、更正、跳版、撤回、還原、sender切換與projection outbox；測兩worker、commit前crash與回應遺失（對應 Business identity and data revisions govern duplicate correction and withdrawal、Report admission and projection invalidation commit atomically、G5. 報表身分與更正）。
- [x] 2.3 [after: 2.2] 完成逐日有效版本加總、期待工程集合／profile時效、缺件與partial；測100+120=220、7/8、0分母（對應 Period totals use one effective result and explicit coverage、G6. 覆蓋與統計）。
- [x] 2.4 [after: 2.3] 完成有界publisher replay／管理匯入、逐筆結果、93日窗口與超期批准；測249筆拒絕、離線兩日與重送跨重啟（對應 Daily delivery recovery is bounded and separate from discovery、G8. 收件排程與補收）。

## 3. 會計與使用介面切片
- [x] 3.1 [after: 1.4, 2.3] 新增SiteEnergyProfileV2 typed refs與common provider分流；測CL v1不變、工程不造假meter、父子拒絕、stale projection不當current（對應 Engineering accounting integrates through typed profile and result providers、G7. 接上既有系統，而非另造假 meter）。
- [x] 3.2 [after: 1.3, 2.4] 接A/B/C/D/E的八工程視圖、來源模式、排程到件、period/version側欄與面板保存；測IME、dirty、7/8和每日捕捉空窗（對應 Engineering workspace separates configuration from report delivery、G9. 介面與移交）。
- [x] 3.3 [after: 3.1, 3.2] 透過display editor連接period-aware kWh與既有kW；測scope隔離、看日不改成今天、舊版consumer明確unsupported（對應 Engineering accounting integrates through typed profile and result providers）。

## 4. 遷移與完整驗收
- [x] 4.1 [after: 3.3] 用shadow→authority cutover→rollback測mode轉換、日界、生效版本、history保留及Solar/CL不受影響；不發正式測試值（對應 Source authority and migration are versioned without duplicating results、Engineering rollout preserves audit and requires only the relevant evidence）。
- [x] 4.2 [after: 4.1] 執行各spec情境對應的shared/server/web與隔離MQTT tests、focused checks及最終pnpm verify；別將文件fixture算成產品測試。
- [x] 4.3 [after: 4.2] 確認實際publisher payload/mode/deadline/replay能力，完成各工程人工交接、適用觀察期間與正式CLI validate/analyze；未通過不宣稱launch-ready或archive（對應 Engineering rollout preserves audit and requires only the relevant evidence）。
