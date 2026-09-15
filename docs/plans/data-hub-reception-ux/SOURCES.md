# 本輪最新 main 與重審

目前基準 `fd405ebc2957232b6c622071622b9c7d830a3a42`；原草稿 commit `1ed0f563d215929f3c010da90a43da3b1399f64b`。已查 main 相對 `0425ed2` 增加 3 commits，涉及新增 opc_mqtt、server tsconfig、lockfile 與 Windows bundle scripts；既有 Solar／DataHub／E1/M2 與下列舊引用檔案未變。原 30 個規劃檔的 Git blob hash 與交付包核對一致後再修改。

本輪是程式與規格交叉審查及文件檢查；未連線現場 MQTT、DDE／VIEW，也未執行產品 browser 測試。原 S01–S17 保留歷史讀取基準；新增 S18–S30 補齊發布端。

# 來源與審閱基準

GitHub main snapshot：`0425ed283fb1f4adc46fe36d3b5c0694c54fd692`。以下由 GitHub connector 讀取；有註記者為選段審閱，不宣稱全檔或全專案已審閱。未對正式服務執行 browser 或 MQTT 操作。

- **S01** [AGENTS.md](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/AGENTS.md) — 規格／文件與提交邊界；本次不改產品碼；依使用者要求提交規格文件
- **S02** [openspec/config.yaml](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/openspec/config.yaml) — spec-driven schema
- **S03** [.agents/skills/openspec-propose/SKILL.md](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/.agents/skills/openspec-propose/SKILL.md) — OpenSpec proposal 規格、planning-only boundary
- **S04** [apps/web/src/pages/DataHub/SourceDetailsDrawer.tsx](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/apps/web/src/pages/DataHub/SourceDetailsDrawer.tsx) — modal 結構、focus effect、尺寸與 footer
- **S05** [apps/web/src/pages/DataHub/Sources.tsx](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/apps/web/src/pages/DataHub/Sources.tsx) — draftTopics、openRow、save/refresh/selection、task gate
- **S06** [apps/web/src/pages/DataHub/SourceCards.tsx](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/apps/web/src/pages/DataHub/SourceCards.tsx) — viewport grid、numeric fallback、managed nesting、summary unknown
- **S07** [apps/web/src/pages/DataHub/Connections/ConnectionsView.tsx](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/apps/web/src/pages/DataHub/Connections/ConnectionsView.tsx) — 現有雙欄與共享提示
- **S08** [apps/web/src/pages/DataHub/Connections/ConnectionStatusCard.tsx](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/apps/web/src/pages/DataHub/Connections/ConnectionStatusCard.tsx) — 正式狀態／測試回饋與無 query anchors
- **S09** [apps/web/src/pages/DataHub/GuidedOnboardingPanel.tsx](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/apps/web/src/pages/DataHub/GuidedOnboardingPanel.tsx) — 四階段、第一 profile/filter、GET test、fixed publish target
- **S10** [apps/web/src/pages/DataHub/workspaceContext.ts](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/apps/web/src/pages/DataHub/workspaceContext.ts) — supported query、replace policy、scope behavior
- **S11** [apps/server/src/routes/settings-mqtt.ts](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/apps/server/src/routes/settings-mqtt.ts) — read/test/save、masked password、full-list replacement、E1 guard
- **S12** [openspec/specs/data-hub-task-workspace/spec.md](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/openspec/specs/data-hub-task-workspace/spec.md) — U1 R1-R9 主契約
- **S13** [openspec/specs/mqtt-observation-catalog/spec.md](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/openspec/specs/mqtt-observation-catalog/spec.md) — M1 reception/provenance/security/bounds；審閱前段主要要求
- **S14** [openspec/specs/guided-mqtt-tag-mapping/spec.md](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/openspec/specs/guided-mqtt-tag-mapping/spec.md) — M2 three-stage/preview/apply；審閱 lines 1–230
- **S15** [openspec/specs/data-hub-management-surface/spec.md](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/openspec/specs/data-hub-management-surface/spec.md) — 中央 Broker 主契約；審閱主要 requirements
- **S16** [docs/ops/conventions.md](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/docs/ops/conventions.md) — 文件檢查與產品驗證命令
- **S17** [apps/web/src/pages/DataHub/index.tsx](https://github.com/Yishow/solar_player/blob/0425ed283fb1f4adc46fe36d3b5c0694c54fd692/apps/web/src/pages/DataHub/index.tsx) — shell nav 與 scope guard

## 外部設計／格式依據

- OpenSpec 官方概念與 delta 文件：[concepts](https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md)。沿用 proposal/design/tasks/specs，既有要求以 MODIFIED 取代，而非複製一套主規格。
- OpenSpec 官方 CLI：[cli](https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md)。strict validation 為 apply 前待執行；本次未宣稱已跑 CLI。
- W3C APG：[Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)。modal focus containment、背景不可互動、合理初始／返回焦點。
- W3C WCAG 2.2：[Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)。320 CSS px 的非例外內容重排要求。
- W3C WCAG 2.2：[Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)。44 px 是本提案的舒適操作設計值，不錯稱為此 AA 條款一律要求的最低值。

以上外部頁面查核日期為 2026-09-15。視覺尺寸、效能門檻與優先序皆為本次提案，不是既有量測或已獲使用者確認的決策。

## 新增發布端依據（2026-09-15）

- **S18** [opc_mqtt/DELIVERY.md](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/opc_mqtt/DELIVERY.md), [opc_mqtt/main.go](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/opc_mqtt/main.go) — DDE view/tagname、同 Session、main 實際引入 internal/dde；不是 OPC DA runtime
- **S19** [opc_mqtt/internal/config/defaults.go](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/opc_mqtt/internal/config/defaults.go) — 20 raw／10 virtual 的程式預設、30 秒與 legacy opc namespace；無 site 配置
- **S20** [opc_mqtt/internal/mqtt/publisher.go](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/opc_mqtt/internal/mqtt/publisher.go), [opc_mqtt/main.go](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/opc_mqtt/main.go) — fixed opc_mqtt_bridge、raw/virtual topic、發布時 ts、read/publish 分離；數字不是 per-tag event metadata
- **S21** [opc_mqtt/internal/engine/engine.go](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/opc_mqtt/internal/engine/engine.go) — float64 計算、round、缺成員 invalid；空公式目前回 0/true，v1 必須額外阻擋
- **S22** [solar_mqtt_go/internal/service/service.go](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/solar_mqtt_go/internal/service/service.go), [solar_mqtt_go/internal/heartbeat/heartbeat.go](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/solar_mqtt_go/internal/heartbeat/heartbeat.go) — summary/whole-zone/scalar 發布、可配置 prefix/retain、timestamp 與 heartbeat ts；以與舊 main 無差異確認延用本對話已讀內容
- **S23** [apps/server/src/mqtt/SolarSourceAdapter.ts](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/apps/server/src/mqtt/SolarSourceAdapter.ts), [apps/server/src/mqtt/MqttClientService.ts](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/apps/server/src/mqtt/MqttClientService.ts) — 五種 managed filters、generic+managed union、active/desired；與舊 main 無差異，延用前輪讀取
- **S24** [solar_mqtt_go/internal/mqttbus/bus.go](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/solar_mqtt_go/internal/mqttbus/bus.go), [solar_mqtt_go/internal/service/control.go](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/solar_mqtt_go/internal/service/control.go), [solar_mqtt_go/internal/webui/web/js/mqtt-manager.js](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/solar_mqtt_go/internal/webui/web/js/mqtt-manager.js), [openspec/specs/solar-collector-control-topic-security/spec.md](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/openspec/specs/solar-collector-control-topic-security/spec.md) — daemon command subscriptions／WebUI subscription-sent；遠端設定不包含 Broker 帳密或 host/port；同舊 main
- **S25** [apps/server/src/services/mqttObservationCatalogService.ts](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/apps/server/src/services/mqttObservationCatalogService.ts), [apps/server/src/mqtt/discoveryTransport.ts](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/apps/server/src/mqtt/discoveryTransport.ts) — factory/cl/、factory/kn/ 批准範圍與獨立 discovery client；同舊 main
- **S26** [openspec/specs/meter-reading-contracts/spec.md](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/openspec/specs/meter-reading-contracts/spec.md), [openspec/specs/solar-collector-source-adapter/spec.md](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/openspec/specs/solar-collector-source-adapter/spec.md) — E1 R1–R7、時間/retain/precision/role 與 E6 邊界；Solar canonical／scalar 保護
- **S27** [packages/shared/src/guidedMqttMapping.ts](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/packages/shared/src/guidedMqttMapping.ts) — 現有 MappingSelector path/timestampPath、MappingPreviewDraft；未含本提案 v1 envelope registry gate
- **S28** [opc_mqtt/internal/dde/reader_windows.go](https://github.com/Yishow/solar_player/blob/fd405ebc2957232b6c622071622b9c7d830a3a42/opc_mqtt/internal/dde/reader_windows.go) — DdeClientTransaction、逐 Item read、回傳 float64；本輪讀取 request/read 實作段
- **S29** GitHub compare `0425ed2...fd405ebc`：3 commits；原草稿分支仍為 `1ed0f56`，本輪重整以新 main 為唯一父提交；不是合併或覆寫 main。
- **S30** OASIS MQTT 3.1.1 正式規格（https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html），以 topic matching／Client ID／retain／QoS 語意核對；Microsoft Interactive Services（https://learn.microsoft.com/en-us/windows/win32/services/interactive-services）核對 Session 0 隔離。兩者為官方文件，2026-09-15 查核。

KN 實體設備、Item、盤別拓樸與部署資訊無可用證據；本輪不將假設寫成現況。tag-register 中 CL 的 site 歸屬也明示待現場審核，只有程式代碼／預設公式是已知。
