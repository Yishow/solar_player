## Problem

未配對的展示機在管理端是完全隱形的。

Device Credential 解析失敗的 client 通不過 socket 身分驗證，因此送不出 `client:heartbeat`，也不會進入 display client liveness registry。`Device Status` 的 `displayClients` 清單只列得出已配對且連線中的 client，那台未配對的機器根本不會出現。

於是管理者看到「清單裡沒有異常」，實際情況可能是那台機器根本沒配對、連清單都進不去。`Device Fleet` 雖然會把該 Device 標為「未配對」，但那是設定面的靜態狀態，看不出「現在真的有一台機器正在嘗試存取而被擋下」。

實測可重現：以未配對瀏覽器開啟 `/overview`，server 對 `/api/display-story/overview` 與 `/api/playback/runtime` 持續回 `401 device_unpaired`，而 `GET /api/device/status` 的 `displayClients` 完全不受影響。

## Root Cause

管理端的展示機可見性只有一條來源 — heartbeat，而 heartbeat 的前提是通過身分驗證。凡是「因為身分驗證失敗而看不見」的情形，這條來源在定義上就不可能涵蓋。

server 其實握有這個事實：`deviceContextPlugin` 的 `requireDisplayClientContext` 在憑證缺失或無法解析時就丟出 `DisplayClientContextServiceError`，並以 401 與 `device_unpaired` 等錯誤碼回應。這個事實目前只寫進 HTTP 回應，沒有被聚合、也沒有任何管理端出口。

## Proposed Solution

把 server 已經知道的未配對存取事實聚合起來，從既有的 `GET /api/device/status` 出口帶給管理端。

- 新增一個 in-memory 的未配對存取聚合器，在 display 路由的 Device Context 前置處理失敗時記錄一次。
- 聚合內容為有界的計數與時間戳，不保留逐筆記錄：依失敗原因分類的累計次數、首次與最近一次發生時間、最近一次被拒絕的路由。
- `GET /api/device/status` 的 `data` 新增一個未配對存取摘要，與既有 `displayClients` 並列，維持既有的管理端存取邊界。
- `Device Status` 管理頁在 display client 區塊旁呈現該摘要，使「有機器正在被擋下」成為可見狀態。
- 摘要為零時明確呈現「無未配對存取」，而非隱藏區塊，避免與「尚未載入」混淆。

## Non-Goals

- 不記錄用戶端 IP、User-Agent 或任何可指向個人的網路識別資料；聚合只保留次數、時間與被拒路由。
- 不保留逐筆存取記錄，也不新增資料表或任何持久化；聚合隨行程存活，重啟後歸零。
- 不改變 `deviceContextPlugin` 既有的 401 行為、錯誤碼或回應格式。
- 不改變 Device 配對機制、Pairing Token 或 Device Credential 的生命週期。
- 不改變 `displayClients` 既有的資料結構與語意。
- 不在展示頁上顯示任何未配對提示；展示端維持無疊層。
- 已評估但不採用「讓未配對 client 送 heartbeat 進入 liveness registry」：那會允許未經身分驗證的來源寫入管理端裝置清單，違反 `identity-aware-display-client-liveness` 的既有要求。

## Success Criteria

- 未配對瀏覽器存取展示 runtime 路由後，`GET /api/device/status` 的未配對存取摘要次數增加，且 `displayClients` 不受影響。
- `Device Status` 管理頁可看出「目前有未配對的存取嘗試」，包含最近一次發生時間與被拒路由。
- 沒有任何未配對存取時，管理頁明確呈現「無未配對存取」而非空白。
- 未受信任的請求呼叫 `GET /api/device/status` 時，仍被既有的管理端存取邊界擋下，且不回傳未配對存取摘要。
- 聚合器的記憶體占用不隨存取次數成長。

## Impact

- Affected specs: `display-client-liveness`、`device-context-site-scoped-playback`
- Affected code:
  - New:
    - apps/server/src/services/unpairedDisplayAccessRegistry.ts
    - apps/server/src/services/unpairedDisplayAccessRegistry.test.ts
  - Modified:
    - apps/server/src/plugins/deviceContext.ts
    - apps/server/src/plugins/deviceContext.test.ts
    - apps/server/src/routes/device.ts
    - apps/server/src/routes/device.test.ts
    - apps/server/src/app.ts
    - packages/shared/src/displayClientLiveness.ts
    - apps/web/src/pages/DeviceStatus/viewModel.ts
    - apps/web/src/pages/DeviceStatus/viewModel.test.ts
    - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
- Affected APIs: `GET /api/device/status` 的 `data` 新增未配對存取摘要欄位（純新增，既有欄位不變）。
- Affected data: 無資料表變更；聚合僅存於行程記憶體。
