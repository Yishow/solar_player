# 觀音工程別 MQTT 來源與期間成果

## Why

使用者已確認「觀音依工程別 publish，Player 依工程別訂閱」。`8beacbd` 的六份草稿卻把 KN 放在逐實體錶／DDE Item 流程，且把所有上游彙整限成診斷。這會拒收正確工程成果。最新 main `818fa0da` 已有八工程與 kW topic，但實體 MeterSourceDefinition、E6 v1 channel refs 及 interval-energy 期間覆蓋仍不等於工程報表支援。

## What Changes

- 將 KN 接入主體定為固定工程代碼；上游負責工程內取數／整理，Player 不要求發布每顆電錶、不要求 DDE Item 或假 meterId。
- 為工程功率、完整日用電、連續累積值定義互斥的資料模式與各自時間語意；發布頻率不決定資料型別。真正發布模式尚未提供，登錄保持停用，實作時逐來源選擇，不要求三套都發布。
- 正式工程成果與非權威 virtual 分開；工程成果可正式使用，但同工程／期間不能再加底下 raw 或另一份成果。
- 新增期間主鍵、更正版／撤回、完整度、跨日合計、有界補收與原子投影失效。
- 增補來源種類與 SiteEnergyProfileV2 的工程模式，透過共用結果入口交付展示；E1 實體錶規則、E6 v1 既有讀取保持相容，不偽造 physical identity。
- DataHub 固定八工程列表、按工程訂閱、排程到件狀態、期間／版本側欄與返回流程。

## Capabilities

### New Capabilities
- `kn-engineering-mqtt-sources`：工程來源身分、模式、topic、資料守衛與接收操作。
- `engineering-period-results`：日報期間、更正、補收、完整度與工程會計／展示接線。

### Modified Capabilities
無直接修改正式主規格。本提交同時修訂 A–F 的 active artifacts；F 的 `kn-power-onboarding` 只負責 KN 啟用關卡，細節以本 change 兩個能力為唯一依據。不得讓兩份 change 重複修改相同 requirement。

## Impact

新增 shared 工程來源／報表契約與可判別來源 reference；apps/server/src/mqtt/MqttClientService.ts 的訂閱和 dispatch；apps/server/src/services/guidedMqttMappingService.ts 的預覽綁定；siteEnergyProfile、periodConsumption 周邊的種類分流及投影／readiness；DataHub 與 display editor 的受控來源選擇。確切新檔名見 design，全部是後續實作計畫。本輪只修改 openspec/changes 與 docs/plans/data-hub-reception-ux。

## Non-goals

不實作／部署、不改 main 中既有 runtime、Seed 資料或 FHD 排版；不要求重新發送底層錶、不代上游重算工程內公式、不猜 KN payload 或發布時間、不直接改 Broker／publisher；不將工程日報塞進 meter_readings，也不建立會與 E1 重複入帳的旁路。
