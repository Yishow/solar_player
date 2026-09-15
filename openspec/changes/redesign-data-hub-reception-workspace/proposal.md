# 接收工作台：來源清單與接收證據

## Why

目前 Sources 預設仍以 mappings 列表與「新增通用 MQTT 主題」為主要入口；只有 `task=connect` 才插入引導面板。既有 U1-R8 與 M1 已要求 mapping 之前可探索觀測資料。引導程式直接選第一個 profile/filter，候選主要顯示 topic，使用者不易理解「沒有設定」與「這段時間沒收到」的不同。

## What Changes

- 在 Sources 保留「已接入來源」，增加一級可發現的「已接收資料」工作視圖。
- 主 CTA 改為「從接收資料新增」；手動 technical mapping 留在進階入口。
- 可選具名的已批准接收範圍，呈現 capture 期間、覆蓋率、授權、樣本品質與來源關聯。
- 統一 URL、selection、filter、search 與返回位置；live refresh 不搶選取、不重排目前工作列。
- 明確區分空清單、查詢失敗、無權限、未開始、等待資料、部分接收與樣本過期。

## Capabilities

### New Capabilities
無。

### Modified Capabilities
- `data-hub-task-workspace`：深化 U1-R8 與 view-state 行為。
- `mqtt-observation-catalog`：新增接收工作台呈現契約；M1 的有界、隔離、授權與 retained 證據規則維持不變。

## Impact

Sources、SourceSummaryRow、sourceWorkspace、workspaceContext、GuidedOnboardingPanel；沿用 capture/profile/candidate/sample API，回應缺少必要證據時明列 server additive contract 工作。不得為 UI 自行建立第二份 raw payload 永久儲存。

## Non-goals

不是 Broker 全 topic 掃描器，不自動訂閱 `#`，不從 topic 字樣推斷授權廠區，不改現有的 E1 歷史／基線，不擴充多 Broker 管理。

## 2026-09-15 跨發布端審查更新

本輪基準為 `fd405ebc2957232b6c622071622b9c7d830a3a42`。本 change 仍是未實作提案，不勾選產品驗收、不歸檔。與本輪新增的 `plan-power-mqtt-publishing-and-kn-onboarding` 共用 [MQTT-OWNERSHIP](../../../docs/plans/data-hub-reception-ux/MQTT-OWNERSHIP.md) 與 [PUBLISH-TAG-REGISTER](../../../docs/plans/data-hub-reception-ux/PUBLISH-TAG-REGISTER.md)。

接收資料必須區分 Solar 託管、電力原始點、電力計算結果與診斷訊息；批准範圍須對應 Solar／OPC 實際 namespace，不沿用 factory/ 範圍假稱涵蓋所有資料。
