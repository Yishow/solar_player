# 實體電力發布契約與觀音工程別接入邊界

## Why

`8beacbd` 已盤點 opc_mqtt 的 active Windows DDE 路徑、20 raw／10 virtual 程式預設及發布端問題，但把 KN 工程成果誤套逐實體錶前提。本次以 main `818fa0da` 重審，保留實體發布修正，將觀音接入改為工程別。

## What Changes

- 保留 Solar publisher／Player 訂閱分工與 opc_mqtt 實體profile的 site topic、唯一Client ID、精確decimal、時間品質、sample重送及安全cutover。
- PMQ-R1～R8 只約束選用physical/raw profile的部署；CL預設仍需現場審查，不宣稱是已啟用設備。
- KN 的工程主體不需 meterId、DDE Item 或 raw逐錶發布；已批准工程成果可正式使用。受控成果不等於未審查virtual。
- KNP-R1～R4 改為工程啟用關卡；其詳細來源與期間規格交由 `add-kn-engineering-mqtt-sources` 的 KNE/EPR，避免同一能力由兩份change重寫。

## Capabilities

### New Capabilities
- `power-mqtt-publishing-contract`：選用physical/raw profile時的bridge發布與遷移。
- `kn-power-onboarding`：工程成果交接與逐工程啟用關卡。

### Modified Capabilities
無；原正式 physical E1 契約不被放寬，G新增種類安全的工程成果與整合能力。

## Impact

未來實作涉及 opc_mqtt reader/config/state/engine/publisher及Player的physical profile gate。工程source/provider由G擁有；A–E只消費。此次只文件，不啟用現場topic、不改配置或歷史。

## Non-goals

不要求觀音逐錶、不把KN工程publisher固定成DDE/OPC、不強制將工程topic搬到opc/raw、不把上游工程彙整全面降為診斷。現行DDE部署同VIEW Session限制只用於真的執行此bridge，不是所有工程訂閱的前置。
