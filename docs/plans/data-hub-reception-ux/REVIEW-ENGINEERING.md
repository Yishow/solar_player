# 8beacbd 工程別修訂 Review

日期2026-09-16；查核main `818fa0da0d24d26ce9f847a5fdf6a9871c57bc0f`，審查原提交 `8beacbd4ce50c393079308b17a2008835e7f8f24`。

## 結論

原提案把觀音工程成果當逐實體錶接入，且把上游彙整全部排成diagnostic，與使用者已確認的發布粒度不合。本次補G `add-kn-engineering-mqtt-sources`，同步A–F的適用範圍與KNP啟用關卡；只有文件，不是產品程式修正。Daily/counter/power模式並未由使用者選定，本稿以三個互斥分支與未配置registry保留決策，不把「按工程別」猜成「每天publish」。

## Finding 與修正

| ID | 8beacbd／重審發現 | 本輪落點 |
|---|---|---|
| ER01 阻擋 | KNP將meterId/Item與site-main作前提 | KNE-R1、KNP-R1/R2；八工程結果不需底層設備 |
| ER02 阻擋 | A/B/D/PMQ把所有virtual排成只診斷 | 明確區分權威工程成果與未審comparison；不讓raw/工程重複入帳 |
| ER03 阻擋 | E1/PeriodSample/E6 v1不支援工程完整日報 | G typed source/report/profile V2/provider；不偽造meter、不宣稱enum代表完整支援 |
| ER04 重要 | KN清單另造SITE_LOAD/FEEDER；power topic可能被塞kWh | 沿用八工程；三種mode、不同topic、不同計算 |
| ER05 重要 | raw的30/90秒與禁補灌被套到日報 | KNE-R6/EPR-R5，排程unknown不猜，原報表有界補收 |
| ER06 阻擋 | 報表重送／更正無業務期別key | EPR-R2/R3：same-version衝突、更正替換、撤回／恢復、current pointer原子保存 |
| ER07 重要 | mqttMeterIngest預設猜ts | 工程gate在generic前，daily驗period，power/counter驗checkpoint，不走自動fallback |
| ER08 重要 | 更正版寫入後舊投影仍可能被當current | 同交易invalidation/outbox＋fingerprint重檢，stale明示 |
| ER09 重要 | 同一天不同publisher／模式可能雙算 | engineering/purpose/effective window單authority，sender換機不重設report lineage |
| ER10 重要 | 日期／profile定義變動、partial降級未明確 | 午夜生效、missing identities、較新partial取代舊final；不按比例硬拆日報 |
| ER11 重要 | 舊check數字與CLI缺失容易被沿用成新驗證 | 保留舊證據為8beacbd歷史，新增可重跑checker與本輪結果；官方CLI未執行成功 |

這是同一代理的兩輪原始碼／規格自審，不宣稱有另一位reviewer。第一輪先修資料主體與跨change衝突；第二輪反查日報日期、重送、更正版、權限、生效範圍、投影失效、模式轉換與rollback。

## 來源與同步

GitHub已確認main為818fa0da且parent包含8beacbd；compare顯示其後更新未改本輪的六份active changes與docs/plans/data-hub-reception-ux。隔離ZIP六個change tree SHA逐一對上main目錄SHA，原planning docs tree為2e05f730041fce02bcbf10bf5303ded4b9ce663b。使用最新main作commit parent，不reset或force main、不覆寫其docs歸檔更新。

本輪重讀siteEnergyProfile.ts（V1 physical refs）及mqttMeterIngest.ts timestamp fallback；同main的seed.ts八工程、meterReading.ts實體要求、periodConsumption.ts interval coverage分支及factory-circuit-multi-site-split已在前輪提供，這輪再以相同基準核對合約缺口。六份提案的spec/proposal/design/tasks在本輪隔離副本全數檢查，非只讀proposal。

固定來源根為 https://github.com/Yishow/solar_player/blob/818fa0da0d24d26ce9f847a5fdf6a9871c57bc0f/ ：apps/server/src/db/seed.ts；packages/shared/src/meterReading.ts、periodConsumption.ts、siteEnergyProfile.ts；apps/server/src/services/mqttMeterIngest.ts；openspec/specs/factory-circuit-multi-site-split/spec.md。這些是程式／規格依據，不是現場Broker或設備證據。

外部：OASIS MQTT 3.1.1 §3.3.1與§4.3（https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html），retained不代表多日歷史、QoS不代替業務去重；OpenSpec官方concepts（https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md），2026-09-16查核。

## 驗證邊界

[工程合約](KN-ENGINEERING-CONTRACT.md)、G兩份spec與14項tasks為目前工程實作依據。check_engineering_plan.py驗artifact、task依賴、連結、八工程停用模板與合成daily/reference結果；不是production parser／資料庫交易／MQTT整合測試。實際輸出保存engineering-validation.json；不聲稱文件fixture涵蓋所有runtime情境。

本環境`spectra instructions --skill analyze --agent codex`回exit127（command not found），官方workflow停止；git網路連線也因DNS失敗，未取得完整產品checkout。本次以手工OpenSpec草稿／GitHub檔案物件完成文件交付，不稱官方validate/analyze已通過。未跑pnpm verify、真SQLite重啟併發、MQTT、DDE、實際上游payload、FHD或現場驗收，所有實作tasks維持未勾選。

## 實際檢查紀錄

本輪離線檢查結果見 [engineering-validation.json](engineering-validation.json)，可由同目錄check_engineering_plan.py重跑。檢查的是artifacts、連結、task DAG及合成daily例子；「passed」不代表產品交易、補收API或MQTT現場已實作。
