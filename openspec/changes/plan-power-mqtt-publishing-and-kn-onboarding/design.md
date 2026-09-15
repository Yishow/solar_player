# Design: 實體發布保護與工程別接入分工

## Context

以 main `818fa0da` 重新review `8beacbd`。opc_mqtt/main.go 現在使用 internal/dde；publisher.go 固定 opc_mqtt_bridge、legacy raw/virtual topic及發布ts；defaults.go的20 raw/10 virtual是程式預設，不是KN現場清單。舊誤解及修正見 [REVIEW-ENGINEERING](../../../docs/plans/data-hub-reception-ux/REVIEW-ENGINEERING.md)。

## Goals / Non-Goals

In scope：保留raw bridge所需可驗證發布改善與單一writer，釐清不適用工程成果的限制。Out of scope：本次產品實作／部署、改Solar、強制KN取數技術、重做工程內公式及現場點位猜測。

## Technical Approach

### F1. 兩類來源，不互相冒充

Solar仍 solar_mqtt_go→MQTT→managed adapter。選用實體profile時，InTouch→opc_mqtt→MQTT→physical gate/M2/E1。KN則由使用者上游工程成果→MQTT→G工程gate／typed provider；Player不要求其底層錶清單。publisher由誰提供及topic匹配由工程registry批准，不因資料是計算結果就禁止正式使用。

### F2. Physical profile 保留的改善

新增 opc/v1/{site}/raw/{tagId} 與 virtual/{id} 不改legacy原義；部署唯一且重啟穩定的Client ID，同topic一個active publisher。CL+KN可同時執行physical bridge的能力不代表KN一定要選它。DDE同登入Session／禁止Windows Service只限此bridge。未有可驗證熱切換則broker改後標saved/restart-required，不能假裝effective target已變。

從DDE原始文字保存decimal，禁止float64/round後再stringify聲稱精確。逐點readAt/sourceTimestamp/publishedAt/receivedAt及device quality分開；DDE成功不造Good或來源事件時間。CL raw的source-required及受審查估計沿用E1；unknown quality policy預設block、逐來源allow-with-limitation不放寬transport/time gate。

sampleId跟實際採集綁定，重送不改acquisition證據；同ID異內容衝突。durable dedup須與accepted寫入原子協作，不能先記已見再丟失domain write。有限等待、重送與逾時unknown不宣稱下游已計量。初版raw live不離線補灌，30秒/90秒是raw設計預設；兩條限制均不適用G日報。

### F3. Raw virtual 與權威工程成果

未審查comparison virtual保留member tags／公式revision，非空且每個成員在批准window有效，否則整組invalid。物理raw的父子與virtual不得重複加總，不直接對跨組員改變的lifetime sum做差分。

但上游已定義、批准的工程成果可在G成為正式sourceKind=engineering，無需還原raw才能進Player。G按daily/counter/power做相應計算，定義／資料更正版／涵蓋範圍分開。F的virtual診斷限制不能用來擋G的正式工程來源。

### F4. 共用工具、分開的domain

Physical v1 gate在generic fallback前驗schema、publisher/site/tag/revision、unit、readStatus、sample/time；同gate供preview/runtime。G提供工程gate與自己的typed source，不能把engineeringId塞meterId或只用$.value。A–E UI依sourceKind分流，共用guard/preview primitives，不共用會產生雙寫的domain handler。

### F5. 遷移與回退

CL raw逐點legacy→v1 shadow、確認精度/單位/時間/consumer後single-writer guarded cutover；未核對連續性不跨sourceRevision/epoch減值。backout停新admission，不刪history、不清Solar retained、不回到blind replace。KN工程不必跟隨CL完成20 raw盤點；先完成單工程結果contract即可試接。每類回退互不改設定。

## File Changes

未來physical：opc_mqtt/internal/config、internal/dde、internal/state、internal/engine、internal/mqtt/publisher.go及main.go；Player的protocol profile/dispatch整合。G工程部分見其design；此清單不是已實作或完整caller inventory。

## Validation

PM01–PM20按明確physical情境驗證，KN01–KN08改按工程交接。isolated broker與Windows/DDE只驗其適用來源，不得以Linux stub冒充現場。需要同source重送/兩worker/crash結果、same-session、失敗成員、unit/reset/版本cutover證據。產品碼交付才跑focused tests及pnpm verify；本次只文件checks。

## Cross-change contract / Open Decisions

[KN-ENGINEERING-CONTRACT](../../../docs/plans/data-hub-reception-ux/KN-ENGINEERING-CONTRACT.md) 與G規範觀音；[PUBLISH-TAG-REGISTER](../../../docs/plans/data-hub-reception-ux/PUBLISH-TAG-REGISTER.md)保留CL對照。KN真payload/mode/deadline/replay仍未提供，initial來源停用；需要確認的是工程成果，不是強制DDE點位。Spectra CLI未取得，官方分析未完成。
