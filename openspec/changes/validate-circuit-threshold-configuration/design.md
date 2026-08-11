## Context

Circuit create 目前用 rated capacity 推導預設門檻，update 則用 COALESCE/現有值組合欄位；兩條路徑都沒有完整 range invariant。若 rated capacity 是負數或單一 partial update 將 attentionMin 拉到 normalMax 以下，SQL 仍會成功。

## Goals / Non-Goals

**Goals:**

- server 對 create/update 使用同一完整 invariant。
- partial patch 不可產生只有跨欄位組合後才看得出的 invalid state。
- invalid mutation zero-write、zero-sync 並回清楚原因。
- management form提前提示相同錯誤。

**Non-Goals:**

- 不改 status 顏色、圖示或 circuit binding模型。
- 不替 operator 猜測/自動重排輸入值。

## Decisions

### 先組 effective candidate，再驗證

建立純函式 `validateCircuitThresholdCandidate(candidate)`。Create 先套用現有 default derivation形成完整 candidate；update先把 existing row與 body合併。Validator檢查所有數值 finite、>=0，以及 monotonic invariant：`normalMin <= normalMax <= attentionMin <= attentionMax <= warningMin <= warningMax <= ratedCapacity`。

選擇完整 candidate而不是逐欄位驗證，因為 `attentionMin` 單看是合法正數，仍可能和 `normalMax` 發生衝突。

### Server 為唯一權威，UI 共用/鏡像規則

若 shared package適合承載，可把純規則放 shared供 web/server共用；否則 web只做即時提示，server重新驗證。API回 structured error，例如 `code=CIRCUIT_THRESHOLD_ORDER_INVALID` 與 bounded `field/reason`。

### 既有 invalid rows 先診斷、不自動改

自動 clamp 可能改變現場警告語意，所以 migration不改 row。管理頁載入時可標示 invalid configuration；readiness可在後續實作中把它列為 operator finding，但本 change核心是阻止新增壞資料。

## Implementation Contract

- negative capacity/threshold、NaN/Infinity、倒置 range mutation回 400且 row未改。
- update只改一欄但合併後破壞順序時一樣拒絕。
- boundary equality合法，例如 `normalMax === attentionMin`。
- valid create/update仍發原本的 circuit settings/display sync events。
- invalid mutation不得發成功 sync event。

## Migration Plan

無 DB migration。部署時先以 read-only audit 列出既有 invalid row；若存在，管理頁提示 operator逐筆修正。Rollback只移除 validator，不影響資料格式。

## Risks / Trade-offs

- [Risk] 現有 UI 曾允許的配置升級後無法再次保存 → 清楚標出違反哪個邊界，讓 operator 修正，而非自動改值。
- [Risk] 未來想支援重疊 warning bands → 屆時以獨立 change修改 invariant；本 change以現行單調三段語意為準。
