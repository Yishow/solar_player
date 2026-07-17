<!--
Each task description MUST state:
- the behavior or contract being delivered (what is observably true when the
  task is complete), and
- the verification target that proves completion (test, CLI invocation,
  analyzer check, manual assertion, or content review).

File paths are supporting context for locating the work, never the task
itself. "Edit file X" is not a valid task — it is missing both behavior and
verification.
-->

## 1. 現場 publisher 建立廠區累積總量

- [x] 1.1 [P] 先以 `solar_mqtt` 單元測試固定「由 solar_mqtt 擁有 zone 到廠區的聚合」及「Publish factory cumulative generation from a complete zone snapshot」：完整 zone snapshot 的 `total_mwh` 必須有限值相加，0 視為有效，並驗證 CL=9986.306 MWh、KN=3659.570 MWh 的圖例。
- [x] 1.2 [P] 先以 `solar_mqtt` 單元測試固定「缺 zone 時保留最後正確 retained total」及「Preserve the last retained factory total when zone data is incomplete」：任一已知 zone 缺少或值為 `None`、`NaN`、`Infinity` 時，summary 不含 `total_mwh`、scalar topic 不發布且產生有界告警；驗證 publisher mock 的 publish/alert 呼叫。
- [x] 1.3 實作 publisher 聚合與發布契約：完整 snapshot 時在 retained QoS 1 的 `solar/{factory}/summary` 加入 `total_mwh`，並發布 retained `solar/{factory}/total_mwh`；不完整時保留 broker 上次有效 retained scalar，並以 1.1、1.2 測試及 Python 全套測試驗證。
- [x] 1.4 讓 publisher 終端狀態可辨識有效廠區總量或缺 zone 告警，但不洩漏連線密碼；以 display 測試或擷取輸出確認 CL/KN、缺值 zone 與錯誤原因均可定位。

## 2. Solar Player 建立 CL + KN canonical generation

- [x] 2.1 [P] 先以 migration 測試固定 CL/KN 六個來源 mapping：兩個 summary topic 的 `today_mwh`、`month_mwh`、`total_mwh` 能被解析，舊的 direct generation mapping 不再與 derived mapping 競爭；依 repo 僅向前 migration 慣例，以重複執行 migration、seed 與 mapping 查詢斷言驗證。
- [x] 2.2 [P] 先以 service 測試固定「以兩個 factory summary 建立 canonical generation」及「Derive canonical generation from complete CL and KN summaries」：只有 CL、KN 都完整且在既有 MQTT timeout 內，才更新 today/month/total canonical metrics，時間戳採兩者較舊者；以完整、缺一廠及過期 payload 案例驗證。
- [x] 2.3 [P] 先以 service 測試固定「不讓部分或倒退總量覆蓋 canonical metric」、「Prevent direct and derived generation sources from competing」及「Reject silent cumulative generation regressions」：partial、stale、legacy direct 或較小的 `total_mwh` 都不得覆蓋 canonical total，且倒退要留下可查的診斷；以資料庫值與錯誤狀態斷言驗證。
- [x] 2.4 實作 `factoryGenerationAggregateService` 並接入 MQTT message 處理：從 CL/KN raw summary 依 2.2 規則正規化 MWh、產生 canonical today/month/total generation，且依 2.3 fail closed；以 2.1–2.3 focused tests 和 server typecheck/build 驗證。
- [x] 2.5 先以 service 與 route tests 固定 explicit reset 契約：只有 trusted mutation、完整 current regression aggregate 與精確 `expectedTotalMwh` confirmation 才能 atomically 接受 lower CL/KN baselines、canonical total 與 generation counter；mismatch、stale source、非 regression 或 untrusted request 均不得改值。
- [x] 2.6 實作 trusted factory-generation baseline reset API 與 transaction，成功時遞增 generation `reset_count` 並回傳 bounded result；以 2.5 focused tests、server build 與 diff scope review 驗證。

## 3. 永續計算、來源與 readiness

- [x] 3.1 [P] 固定「沿用 cumulative counter 與 carbon factor 契約」及「Carbon reduction is derived uniformly from generation and the carbon emission factor across playback pages」：`MetricsAccumulatorService` 只消費 canonical total generation，永續累積用量使用 CL+KN=13645.876 MWh，CO2 使用既有係數計算；以 accumulator、story service 與 playback view model 測試驗證，不新增 MQTT CO2 topic。
- [x] 3.2 [P] 實作「readiness 與 provenance 顯示 derived dependency」、「Identify CL and KN as the cumulative Sustainability source」及「Evaluate derived generation coverage from CL and KN dependencies」：來源顯示 CL+KN 聚合，任一 factory mapping 缺失、無值或過期時 coverage/readiness 不得誤報 ready；以 server readiness/provenance 與 web 呈現測試驗證。

## 4. 整合與現場驗收

- [x] 4.1 執行 publisher Python 測試、相關 server/web focused tests、`pnpm verify`、`spectra validate aggregate-cl-kn-total-mwh-for-sustainability` 與 `spectra analyze aggregate-cl-kn-total-mwh-for-sustainability --json`；所有命令成功且沒有 Critical/Warning 才算完成。
- [x] 4.2 依「以 publisher 與 broker live witness 驗收」在測試 broker 證明完整 snapshot 會更新 retained summary/scalar，不完整 snapshot 不會覆蓋 retained scalar且會告警；保存 `mosquitto_sub` 或等價輸出，並核對 CL=9986.306、KN=3659.570、合計=13645.876 MWh。
- [ ] 4.3 依部署 skill 的一般更新流程同步 publisher 與 Solar Player、備份可回滾材料，於 Pi 驗證 MQTT/readiness/API 後取得 Sustainability fresh FHD witness；驗收必須分別覆蓋 CL-only、KN-only、CL+KN 與兩廠皆停用，並將各 scope 的累積用量、CO2、provenance 與現場 retained topic 證據列入紀錄。

## 5. 永續依播放設定切換廠區 scope

- [x] 5.1 先以 server 測試固定「播放設定的廠區啟用組合是 Sustainability 唯一 scope」及「Resolve Sustainability factory scope from playback page enablement」：`factory-circuit`／`factory-circuit-guanyin` 四種 enabled 組合必須解析為 CL、KN、CL+KN、none，且 none 不得回退預設廠；以 scope resolver 與 story service 測試驗證。
- [x] 5.2 先以 server/web 測試固定「單廠與雙廠 scope 各自驗證來源完整性」、「Expose independently validated factory snapshots」、「Carbon reduction is derived uniformly from generation and the carbon emission factor across playback pages」及「Identify the playback-scoped factory source for Sustainability」：CL=9986.306 MWh／4943.221 tCO2、KN=3659.570 MWh／1811.487 tCO2、雙廠=13645.876 MWh／6754.709 tCO2，且未選廠與非目前 scope 的 stale source 行為符合規格。
- [x] 5.3 實作 factory-scoped Sustainability story：讀取既有 playback page enablement，不新增 selector 或第二個持久化設定；單廠使用該廠已驗證 snapshot、雙廠使用完整 aggregate、none 回傳明確不可用狀態，CO2 與植樹等效共用 scoped generation；以 5.1、5.2 focused tests、server typecheck/build 驗證。
- [x] 5.4 實作「Refresh Sustainability when playback factory enablement changes」、「Evaluate Sustainability coverage for the playback factory scope」及設計決策「readiness 與 provenance 顯示 scoped dependency」：播放設定儲存後，單一 `/sustainability` 在下一次既有 refresh 反映新 scope，readiness/provenance 只列必要廠區；以 playback API、socket/refresh、readiness 與 Sustainability view model 測試驗證。
- [x] 5.5 執行相關 server/web focused tests、`pnpm verify`、`spectra validate aggregate-cl-kn-total-mwh-for-sustainability` 與 `spectra analyze aggregate-cl-kn-total-mwh-for-sustainability --json`；四種 scope 均有測試證據且沒有 Critical/Warning 才可進入 4.3 現場驗收。
