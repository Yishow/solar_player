# 資料中樞與觀音工程別 OpenSpec 規畫

目前修訂基準main `818fa0da`；重審`8beacbd`，已修掉KN逐錶前提。沒有產品實作／部署，只有規格與合成驗證資料。

優先讀 [本輪Review](REVIEW-ENGINEERING.md)、[工程交接契約](KN-ENGINEERING-CONTRACT.md)、[觀音導入計畫](KN-POWER-ROLLOUT.md)。工程ID沿用八個既有slot；publisher payload/mode/deadline尚未確認，registry維持停用。

新增G：[add-kn-engineering-mqtt-sources](../../../openspec/changes/add-kn-engineering-mqtt-sources/proposal.md)，含工程source與period-results規範、design及14項有依賴的實作任務。原A–F的spec/proposal/design/tasks已同步工程邊界；F保留physical publishing與KN啟用關卡，不再擁有工程期間演算法。

[MQTT責任](MQTT-OWNERSHIP.md)、[CL/KN tag登錄](PUBLISH-TAG-REGISTER.md)、[機器可讀模板](tag-register.json)、[共用API/狀態](STATE-AND-API-CONTRACTS.md)、[驗收與交付](ROLLOUT-AND-ACCEPTANCE.md)與[固定來源](SOURCES.md)一併對齊。

`planning-checks.json`及REVIEW是舊commit歷史證據；本輪結果在engineering-validation.json。`python docs/plans/data-hub-reception-ux/check_engineering_plan.py`只跑離線文件／合約範例檢查，不能代替官方CLI、產品tests或MQTT現場驗收。
