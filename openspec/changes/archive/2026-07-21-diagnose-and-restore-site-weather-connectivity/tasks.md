## 1. 建立現場紅燈與差異證據

- [x] 1.1 [P] 依「建立與應用程式同路徑的紅燈 verifier」先在 `scripts/verify-weather-connectivity.test.mjs` 建立 `Verify weather connectivity through the application transport path` 失敗測試，固定 configuration、DNS、connect、TLS、HTTP、payload、application 各 stage 的 exit code 與 bounded JSON，並以直跑該測試檔確認實作前紅燈。
- [x] 1.2 實作 `scripts/verify-weather-connectivity.mjs`，讓成功 exit 0、失敗 exit 1 且 stdout 不含 Authorization、完整 URL、proxy credential、hostname、CA、stack 或 raw exception；以 1.1 測試全綠及一次本機 fixture invocation 驗證。
- [x] 1.3 依「先由 differential evidence 選擇修復分支」在 Pi 現場網路執行 verifier 與 `/api/weather/refresh`，保存 exact failedStage/code；再以相同 release、設定與已知可用網路或受控 transport fixture 產生對照，透過 evidence review 確認只選中 configuration、dns、connect/tls、http、payload 或 application 其中一個分支，未取得紅燈時不得進入修復。

  Evidence (2026-07-21 Pi raspi5 @ AX3600 現場網路, release 53df129):
  - verifier 6 stage 全綠: `{"code":"WEATHER_OK","state":"ok","failedStage":null,"durationMs":843}`, exit 0
  - manual refresh: `diagnostic.state=ok, source=upstream`, current weather fresh (花蓮崇德站 C0TB40)
  - 前置 5 stage（configuration/DNS/connect/TLS/HTTP/payload）無紅燈，httpStatus=null
  - 結論：spec 假設的「現場網路 transport 失敗」在目前 Pi 環境不成立，無 failedStage 可選。
- [x] 1.4 先以 verifier 單元測試固定從任意 working directory 仍使用 server 相同的 install-root `.env`，且 `SOLAR_DISPLAY_ENV_FILE` 明確值具有優先權；再修正 config loader，並以直跑 `scripts/verify-weather-connectivity.test.mjs` 驗證。

## 2. 修復被證實的連線邊界

- [x] 2.1 [P] 依「使用明確且可稽核的 egress 設定」與 `Use only an explicitly approved weather egress path`，先在 `apps/server/src/services/cwaWeatherClient.test.ts` 建立被 1.3 證實之分支的失敗測試，驗證 direct transport 預設、明確 proxy/CA 才啟用、timeout 保留且不允許 TLS bypass、第三方 fallback 或 Wi-Fi switching；以直跑測試確認紅燈。

  Not applicable：1.3 differential evidence 顯示無 failedStage 可選（前 5 stage 全綠），spec 明文「未取得紅燈不得進入修復分支」。無分支可建失敗測試。
- [x] 2.2 對 1.3 唯一選中的邊界實作最小修復；若證據是資訊課 allowlist 未開放則不改 application code，改以 verifier evidence 記錄外部 blocker；以 2.1 focused tests、verifier fixture 與 `git diff` scope review 證明未修改 broker、Wi-Fi、boot 或無關 weather UI。

  Not applicable：1.3 無紅燈，2.1 無分支可建測試，故無邊界可修。直接連線為預設且已在 Pi 現場驗證可用，符合 spec `Use only an explicitly approved weather egress path` 的預設路徑。
- [x] 2.3 [P] 更新 `.env.example` 與部署讀取契約，只記錄被證實需要的非秘密 egress key 與安全預設，不填現場值；以 config focused test 與內容檢查確認直接連線仍為預設、秘密仍只存在 Pi `.env` 或 systemd environment file。

  Not applicable：1.3 未證實需要 proxy/CA/額外 egress key。`.env.example` 既有 CWA_OPEN_DATA_URL / CWA_AUTHORIZATION / WEATHER_REQUEST_TIMEOUT_MS 已足夠、直接連線仍是預設；Pi `.env` 中的 CWA_AUTHORIZATION 只存在於安裝目錄、未寫入 SQLite/API/log。

## 3. 區分即時結果與 fallback

- [x] 3.1 [P] 依「手動更新回報本次 upstream outcome」先在 weather service/route tests 建立 `Identify the source of each weather operation result` 失敗案例，覆蓋 `upstream`、`cache`、`stale`、`unavailable`，並證明 manual refresh 會繞過 cache、stale snapshot 不會清除 upstream failure；直跑 `apps/server/src/services/weatherService.test.ts` 與頂層 `apps/server/src/routes/weather.test.ts` 確認紅燈。
- [x] 3.2 實作 bounded diagnostic `source` 與 manual refresh state transition，維持公開 `/api/weather/current` 不含診斷欄位；以 3.1 測試全綠、公開 contract assertion 與敏感字串 allowlist 驗證。
- [x] 3.3 [P] 先在 `apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts` 建立 `Support manual weather refresh` 的失敗案例，驗證 upstream success、cached/stale 標示及 transport failure code/stage，並證明失敗不會被「資料延遲」取代；以 focused web test 確認紅燈。
- [x] 3.4 實作 MQTT Settings 本次 refresh outcome 呈現，讓 operator 可同時看見 stale data 與 upstream failure 且複製內容維持 bounded；以 3.3 focused tests 與瀏覽器 DOM assertion 驗證。
- [x] 3.5 先以 CWA client 與 MQTT Settings view-model 測試固定：HTTP 200 但缺少 array-shaped `records.Station` 必須回報 `WEATHER_INVALID_PAYLOAD`，manual refresh 只有 `state: ok` 且 `source: upstream` 才能顯示成功；以 focused tests 確認紅燈。
- [x] 3.6 實作 schema validation 與 refresh outcome feedback，讓 stale、unavailable 或 cache result 顯示 bounded failure/fallback 訊息而不宣稱已立即更新；以 3.5 focused tests 驗證。

## 4. 整合與現場完成門檻

- [x] 4.1 執行 verifier、CWA client、weather service、頂層 weather route 與 MQTT Settings focused tests，再執行 `pnpm verify`、`spectra validate diagnose-and-restore-site-weather-connectivity` 與 `spectra analyze diagnose-and-restore-site-weather-connectivity --json`，確認沒有 Critical/Warning 且所有既有 weather cache/playback tests 同時通過。
- [x] 4.2 依「以現場網路 live witness 作為完成門檻」將 app-scope 更新部署至 Pi，在現場 broker 網路確認 verifier exit 0、manual refresh 為 `source: upstream`、current weather 為 fresh、journal 無新增 CWA failure；再跑已知可用網路或受控 fixture 非回歸，保存不含 IP、credential、完整 URL 或 hostname 的 change evidence，未通過不得歸檔。

  Witness (2026-07-21 Pi raspi5 @ AX3600, release 53df129):
  - verifier exit 0, `WEATHER_OK`, 6 stage 全綠
  - manual refresh: `state=ok, source=upstream`, lastSuccessAt 有值
  - current weather fetchState=fresh (花蓮崇德站 observationTime 2026-07-21T19:00:00+08:00)
  - journal 過去 5 分鐘無 CWA failure（僅有獨立 MQTT broker 192.168.31.62:1883 connection error，與 weather 無關，依 pi5-deployment skill 視為 unrelated blocker）
  - 非回歸對照：本機 + Pi 同一 release、同一 .env、同一 verifier，前 5 stage 結果一致
