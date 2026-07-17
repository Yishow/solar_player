## Context

Solar Player 的 CWA client 自 `d99aff6863a325659825d095dd0617aade26f9d4` 建立後，一直由 Node server 直接使用 HTTPS dataset URL 與 Authorization 查詢參數發出請求。`32fcb5f6a3d99647ea5a9880fee3cab59ff6126d` 只改 Overview 視覺；`62d2534e85d57bfd71cf1d3b0bd0f33ff27a2d2b` 在 client 外層加入 cache、manual refresh 與 MQTT publish，沒有改 transport。現場網路失敗、維護熱點成功的最新回報尚未能由 agent 即時擷取，因 Pi 的 SSH target 目前逾時。因此 root cause 必須在 apply 的第一階段以同一路徑重現，不得從 commit 時序直接推定。

## Goals / Non-Goals

**Goals:**

- 建立數秒內可重複執行、會對現場症狀變紅的 weather connectivity verifier。
- 分開判斷 DNS、connect/TLS、HTTP/payload 與 cache/fallback，並保留 bounded evidence。
- 只對已證實的邊界實作最小修復；若現場需要 proxy 或自訂 CA，使用明確部署設定且不洩漏秘密。
- 讓管理頁手動更新清楚顯示本次 upstream outcome，不再把連線失敗泛化為「資料延遲」。
- 以現場網路 live witness 證明修復，不以維護熱點成功代替驗收。

**Non-Goals:**

- 不修改 Wi-Fi profile、優先順序、Tailscale、broker、OS resolver、磁碟、桌面或 boot 設定。
- 不加入第三方天氣來源、自動切換熱點或未經資訊課核准的 fallback endpoint。
- 不把 CWA Authorization、完整 URL、proxy credential、hostname、憑證內容、stack 或 raw exception 顯示於頁面或 verifier output。
- 不因 `32fcb5f…` 或 `62d2534…` 的時間關係而回退無關的視覺、cache 或 MQTT 功能。

## Decisions

### 建立與應用程式同路徑的紅燈 verifier

新增 `scripts/verify-weather-connectivity.mjs`，從安裝目錄讀取與 server 相同的 environment shape，依序執行 configuration、DNS、connect/TLS、HTTP/payload 與 application refresh 檢查。輸出單一 bounded JSON，至少包含 `state`、`failedStage`、`code`、`httpStatus`、`durationMs` 與不含秘密的 `safeSummary`；成功 exit 0，任一必要階段失敗 exit 1。測試以注入式 resolver/fetch/application probe 固定每個 stage，不直接依賴公網。

verifier 的 `.env` 路徑必須與 server 啟動契約一致：優先使用明確的 `SOLAR_DISPLAY_ENV_FILE`，否則以 verifier module 所在 repository/install root 解析 `.env`，不得依賴 operator 當下的 working directory。

替代方案是只看 journald 或頁面；它們能描述失敗，但不能穩定比較現場網路與維護熱點的同一條 transport 路徑，因此不採用作為唯一 feedback loop。

### 先由 differential evidence 選擇修復分支

apply 第一階段必須保存一次現場網路紅燈結果，並以相同 release、設定與 verifier 在已知可用網路或受控 transport fixture 得到對照。修復分支由 `failedStage` 決定：

- `configuration`：修正部署設定形狀或讀取方式。
- `dns`：確認資訊課核准 hostname 與 resolver 回應；應用程式不自行改 OS DNS。
- `connect` 或 `tls`：若資訊課要求 proxy 或 CA，讓 CWA client 明確使用核准的 proxy/CA environment；否則回報網路 allowlist 缺口，不用程式繞過。
- `http`：修正 endpoint、Authorization 傳遞或 status handling。
- `payload`：修正 CWA response parser 並保留 invalid-payload diagnostic。
- `application`：修正 cache clear、refresh route 或 service state transition。

每次只改一個被證實的分支。若證據顯示資訊課端未開放必要 hostname/port，change 記錄外部 blocker，不提交假修復。

### 使用明確且可稽核的 egress 設定

CWA transport 保留直接連線為預設。只有 deployment environment 明確提供核准的 proxy 或 CA 設定時才使用該路徑；設定缺失或無效時 fail closed 並產生既有 bounded diagnostic。秘密只留在 Pi `.env` 或 systemd environment file，不寫入 SQLite、API response、repository evidence 或 logs。

替代方案是自動偵測 proxy、信任所有憑證或改用 HTTP；這些行為不可稽核且會降低安全性，因此拒絕。

### 手動更新回報本次 upstream outcome

manual refresh 必須繞過 weather cache 並完成一次 upstream attempt。trusted response/diagnostic 增加 bounded `source`，值限定為 `upstream`、`cache`、`stale` 或 `unavailable`；管理頁以此顯示「即時取得成功」、「快取資料」、「使用舊資料」或具體錯誤碼。公開 `/api/weather/current` 維持既有 contract，不加入診斷細節。

HTTP 200 只代表 transport 成功；CWA payload 還必須包含 array-shaped `records.Station` 才能進入 options/current normalization。missing 或非 array schema 必須回報 `WEATHER_INVALID_PAYLOAD`，不得產生看似 fresh 的空選項結果。

### 以現場網路 live witness 作為完成門檻

完成條件不是 unit tests 或維護熱點成功。必須在安裝 Pi 的現場 broker 網路上執行 verifier 與 manual refresh，確認 verifier exit 0、diagnostic 為 upstream success、current weather 為 fresh，且 journal 沒有新的 CWA failure。再以維護熱點或 transport fixture 做非回歸對照。

## Implementation Contract

- Operator behavior: 在 MQTT Settings 點擊「立即更新」後，頁面顯示本次是否真正連到 CWA；連線失敗時顯示 bounded code 與 stage，不顯示通用「資料延遲」來掩蓋錯誤。
- CLI interface: `pnpm exec node scripts/verify-weather-connectivity.mjs --base-url http://127.0.0.1:3000`。stdout 只輸出 bounded JSON；成功 exit 0，失敗 exit 1。CLI 不得輸出 Authorization、完整 dataset URL、proxy credentials、hostname、CA content、stack 或 raw exception。
- Trusted API data: weather diagnostic 增加 `source: upstream | cache | stale | unavailable`。manual refresh settled 後的 diagnostic 必須描述該次 attempt，而不是先前 cache。
- Failure behavior: DNS、connect timeout、request timeout、TLS、HTTP、invalid payload 與 unknown 延用 stable codes；verifier 另用 `failedStage` 指出失敗邊界。stale snapshot 可繼續供 playback 使用，但 management result 必須同時顯示 upstream failure。
- Regression gates: 先建立每個 verifier stage 與現場症狀的失敗測試；直跑 CWA client、weather service、weather route、verifier 與 MQTT Settings tests；再執行 `pnpm verify`、Spectra validation/analyze，以及 Pi live witness。
- In scope: server CWA transport configuration、cache/refresh state、trusted diagnostics、MQTT Settings result、safe verifier 與 app-scope deployment evidence。
- Out of scope: host network policy、Wi-Fi switching、broker、OS package/boot changes、第三方 weather fallback 與公開 playback API 擴張。

## Risks / Trade-offs

- [Pi 目前 SSH 不可達，初始 root cause 尚未捕獲] → apply 第一項是現場紅燈 witness；未取得前禁止選擇修復分支。
- [proxy 或 CA 支援增加 transport 複雜度] → 僅在 live evidence 證明需要時實作，直接連線仍為預設並加入 focused tests。
- [manual refresh 增加 CWA request 次數] → 只由 trusted operator 觸發，既有定時 cache 行為不變。
- [diagnostic source 與現有 fetchState 混淆] → source 只描述本次取得來源，fetchState 繼續描述 playback snapshot 狀態，兩者在 shared type 與測試中分開。
- [現場 allowlist 本身仍錯誤] → verifier 明確輸出失敗 stage，將可交付資訊課處理，不以程式繞過網路政策。
