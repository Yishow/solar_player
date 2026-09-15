# 資料中樞接收、轉換與雙發布端整合計畫

本包基於 main `fd405ebc2957232b6c622071622b9c7d830a3a42`，更新原五份 UX/交易提案，新增一份電力發布與觀音導入提案。只有 planning artifacts，沒有產品實作、部署、MQTT 發送或現場啟用。

先讀 [REVIEW](REVIEW.md) 查看查核、修正與未驗證事項；再讀 [MQTT-OWNERSHIP](MQTT-OWNERSHIP.md)、[PUBLISH-TAG-REGISTER](PUBLISH-TAG-REGISTER.md) 與 [KN-POWER-ROLLOUT](KN-POWER-ROLLOUT.md)。[tag-register.json](tag-register.json) 是離線計畫資料，不可當 runtime config 匯入。

| Change | 範圍 |
|---|---|
| [refine-data-hub-source-inspector](../../../openspec/changes/refine-data-hub-source-inspector/proposal.md) | 側欄、焦點、來源與發布端辨識 |
| [redesign-data-hub-reception-workspace](../../../openspec/changes/redesign-data-hub-reception-workspace/proposal.md) | 已接入／已接收、批准範圍、資料分類 |
| [clarify-data-hub-connection-diagnostics](../../../openspec/changes/clarify-data-hub-connection-diagnostics/proposal.md) | 只管理 Player 接收端、測試與實際生效分開 |
| [streamline-data-hub-mapping-journey](../../../openspec/changes/streamline-data-hub-mapping-journey/proposal.md) | 三階段、共用 gate、Solar 重用與 raw/virtual 邊界 |
| [harden-data-hub-source-edit-transactions](../../../openspec/changes/harden-data-hub-source-edit-transactions/proposal.md) | 單筆版本／草稿／single-writer 與訂閱保留 |
| [plan-power-mqtt-publishing-and-kn-onboarding](../../../openspec/changes/plan-power-mqtt-publishing-and-kn-onboarding/proposal.md) | opc_mqtt DDE→MQTT v1 契約、tag 清單、觀音分階段導入 |

共用 API/狀態見 [STATE-AND-API-CONTRACTS](STATE-AND-API-CONTRACTS.md)；交付順序與 AC/PM/KN 驗收案例見 [ROLLOUT-AND-ACCEPTANCE](ROLLOUT-AND-ACCEPTANCE.md)；逐檔依據見 [SOURCES](SOURCES.md)。所有 tasks 保持待執行，不以提交文件代替實作、CLI 驗證或人工驗收。
