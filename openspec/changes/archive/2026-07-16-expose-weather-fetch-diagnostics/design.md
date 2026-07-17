## Context

天氣即時值與縣市／測站選項都由 server 的 `CwaWeatherClient` 呼叫同一個 CWA dataset。現行 current-weather 失敗只寫入 journald 並回傳 stale/unavailable，options 失敗則直接向 route 傳播；管理頁無法取得一致的錯誤碼。播放 weather contract 是公開讀取面，不能承載內部網路診斷；`/settings/mqtt` 已有受信任管理讀取邊界，適合提供操作員診斷。

## Goals / Non-Goals

**Goals:**

- 將 current 與 options 的 CWA 失敗分類為穩定錯誤碼。
- 在 server 記錄最近一次 weather operation 結果與最後成功時間。
- 透過受信任的管理 API 提供安全、有限且可測試的診斷物件。
- 在 `/settings/mqtt` 天氣區常駐顯示狀態，失敗時讓錯誤碼可一鍵複製。

**Non-Goals:**

- 不變更現場防火牆、DNS、Wi-Fi、broker 或 CWA token。
- 不在本 change 改成 server 背景排程或調整重試頻率。
- 不保存完整診斷歷史、不新增資料庫 migration。
- 不把診斷細節顯示在 Overview、Header 或其他公開播放頁。
- 不暴露 raw exception stack、Authorization、完整 URL、broker 帳密或內網位址。

## Decisions

### 使用穩定的 weather 診斷碼

CWA client 將底層錯誤正規化為固定代碼：`WEATHER_UNCONFIGURED`、`WEATHER_DNS_LOOKUP_FAILED`、`WEATHER_CONNECTION_TIMEOUT`、`WEATHER_REQUEST_TIMEOUT`、`WEATHER_TLS_FAILED`、`WEATHER_HTTP_ERROR`、`WEATHER_INVALID_PAYLOAD`、`WEATHER_UNKNOWN_ERROR`。HTTP 錯誤可附帶數值 status；其他底層 code、hostname、URL 與 stack 不進 API。

替代方案是直接顯示 Node/fetch error message；拒絕原因是字串不穩定、難以測試且可能洩漏環境資訊。

### 由 WeatherService 維護最近一次診斷狀態

WeatherService 在 current 或 options 嘗試開始、成功與失敗時更新單一 in-memory diagnostic。狀態包含 `state`、`operation`、`code`、`occurredAt`、`lastSuccessAt`、`httpStatus`、`retryable` 與固定安全摘要。服務重啟後回到 `never-attempted`，不新增持久化成本。

替代方案是從 journald 即時解析；拒絕原因是需要 sudo/helper、資料格式不適合作為 API contract，且無法可靠關聯最後成功時間。

### 以獨立受信任端點提供診斷

新增 `GET /api/weather/diagnostics`，沿用 management trusted-read gate。公開的 `GET /api/weather/current` 與播放 header contract 不增加診斷欄位，避免擴大資訊暴露面。route 回傳 `{ diagnostic }`，未嘗試與未設定都使用 200 加明確 state；不以 5xx 表示「目前上游失敗」，因為端點本身成功提供了診斷。

替代方案是把診斷塞入 current/options response；拒絕原因是 current 是公開播放資料，而 options 的失敗本身可能使 response 無法建立。

### 在 MQTT Settings 天氣區顯示可複製診斷

頁面載入、手動刷新以及 options/current 請求完成後重新取得 diagnostics。診斷區常駐顯示最近狀態與時間；錯誤狀態突出顯示 code、操作類型、安全摘要、HTTP status（存在時）、可重試性與最後成功時間，並提供複製錯誤碼按鈕。複製內容只包含安全欄位。

替代方案是只在 toast 顯示；拒絕原因是 toast 消失後無法讓現場人員抄錄或交付資訊課。

## Implementation Contract

- `WeatherDiagnostic` 具備固定 state：`never-attempted | ok | error | unconfigured`，operation：`current | options | null`，以及 nullable code、occurredAt、lastSuccessAt、httpStatus，並包含 boolean retryable 與安全摘要。
- current 與 options 成功都更新 state 為 `ok` 並更新 `lastSuccessAt`；失敗更新 state 為 `error` 且保留既有 `lastSuccessAt`；未配置授權使用 `unconfigured` 與 `WEATHER_UNCONFIGURED`。
- `GET /api/weather/diagnostics` 只允許受信任管理讀取。未受信任請求必須沿用現有拒絕回應，且不得在拒絕回應中包含診斷。
- UI 必須在沒有診斷、成功、未設定及錯誤四種狀態下保持可讀；錯誤碼必須可複製，複製內容不得含 token、完整 URL、帳密、stack 或 hostname。
- server tests 必須覆蓋 DNS、timeout、TLS、HTTP status、invalid payload、unknown、成功後失敗保留 lastSuccessAt，以及 options/current 兩種 operation。
- route tests 必須覆蓋 trusted success、untrusted denial 與 response 不含敏感字串。
- web tests 必須覆蓋四種 state、錯誤 code/時間顯示與複製 payload。
- 本 change 僅提供診斷可視性；天氣背景排程、重試策略及現場網路修復明確不在範圍內。

## Risks / Trade-offs

- [Risk] in-memory 診斷在 service restart 後消失 → 以 `never-attempted` 明確表示，不假裝有歷史資料。
- [Risk] fetch error 的跨 Node 版本形狀不同 → 分類器只讀允許清單中的 name/code/status/cause，無法辨識時落到穩定的 unknown code。
- [Risk] UI 診斷被誤認為自動修復 → 明確顯示這是最近請求結果與可重試性，不宣稱網路已修復。
- [Risk] 診斷端點擴大資訊面 → 沿用 trusted-read gate 並以 allowlist 組裝 response。
