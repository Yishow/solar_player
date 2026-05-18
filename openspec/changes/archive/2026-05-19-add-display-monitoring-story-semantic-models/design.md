## Context

Overview、Solar、Factory Circuit 三頁目前都能顯示內容，但語意層分散在各自 view model：metric key、fallback、status label、告警與 slot 推斷沒有共用契約。這讓 settings、editor 與後續 readiness surface 很難判斷一個展示頁究竟缺什麼資料或正在傳達什麼運行狀態。

## Goals / Non-Goals

**Goals:**

- 為 Overview 建立可配置的 metric binding 與摘要/告警模型。
- 為 Solar 建立 flow state 與目標對比語意。
- 為 Factory Circuit 建立明確 slot binding 與異常原因模型。
- 抽出三頁共用的 monitoring story model。

**Non-Goals:**

- 不在此 change 內建立 MQTT topic CRUD 或 circuit CRUD 的完整 UI。
- 不在此 change 內處理永續頁期間切換與圖片頁播放清單。
- 不在此 change 內重做展示頁幾何 editor。

## Decisions

### Define a shared monitoring story model across Overview, Solar, and Factory Circuit

三頁共用的不是版面，而是資料 freshness、alert tone、fallback reason 與 story block 的資料契約。這層抽出後，page-local view model 只負責映射到各頁展示樣式。

### Keep Overview story metric binding declarative

Overview KPI 與摘要區不再綁死在固定順序，而是使用可配置 metric binding 與 summary state。這讓後續換指標或新增告警層時不必重寫頁面邏輯。

### Replace Factory Circuit heuristic mapping with explicit slot binding

Factory Circuit 不再依 icon 或名稱 heuristic 判斷哪條迴路屬於哪個展示 slot，而是保存明確 slot binding。這是後續 readiness 與告警可預測的前提。

## Implementation Contract

- Behavior:
  - Overview 可根據配置綁定不同 KPI 與摘要狀態，並顯示資料 freshness 或告警層。
  - Solar 可顯示 flow state、目標對比與運行情境，不再只有靜態 node 文案。
  - Factory Circuit 以明確 slot binding 顯示 load rows，並帶出異常原因與 row 顯示策略。
- Interface / data shape:
  - shared story model 至少支援 `metricBinding`, `freshnessState`, `alertTone`, `fallbackReason`, `slotBinding`, `comparisonTarget` 或等價欄位。
- Failure modes:
  - 缺少綁定資料時使用明確 fallback，而不是任意猜測或崩潰。
  - 無法解析的 slot binding 要回傳可診斷結果。
- Acceptance criteria:
  - view model tests 覆蓋三頁的新故事語意與 fallback。
  - server 或 shared tests 覆蓋 story model 解析與 slot binding 驗證。
- Scope boundaries:
  - in scope: Overview/Solar/Factory Circuit 的語意模型與共用契約。
  - out of scope: settings UI 全量整合、永續敘事、圖像播放清單。

## Risks / Trade-offs

- [Risk] 共用 story model 過度抽象 → Mitigation: 只抽出 freshness、alert、binding、comparison 等跨頁共通欄位。
- [Risk] page-local 樣式仍有差異造成實作複雜 → Mitigation: 把共用契約與頁面映射清楚分層。
- [Risk] heuristic 與 explicit binding 過渡期資料不一致 → Mitigation: 提供兼容 fallback 並把 readiness 問題顯性化。
