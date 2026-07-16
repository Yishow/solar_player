## Context

`/api/device/status` 已在每次請求中同步取得 CPU load average、Linux 記憶體與目標資料目錄的 filesystem stats；Device Status view model 也已有四個資源卡，其中溫度目前固定呈現 `Unavailable`。目前缺口是可信的 Pi 5 溫度與風扇來源，以及能在不改變現有管理權限與刷新模型的前提下呈現它們。

此 change 橫跨 server route 與 web view model/rendering，但不建立新的服務、資料模型或依賴。主要利害關係人是透過受信任管理端查看 Pi 5 健康狀態的維運人員。

## Goals / Non-Goals

**Goals:**

- 每次既有 `/api/device/status` 請求都回傳當下可取得的 Pi 5 溫度與風扇 telemetry。
- 保留現有 CPU load、記憶體與磁碟資料，讓五類主機資源在同一頁可讀。
- 只使用低成本的 `/proc`、`/sys` 與 `statfs` 讀取，且對不支援與讀取失敗提供明確 unavailable 狀態。
- 維持既有 trusted-management-read 權限邊界與 response envelope。

**Non-Goals:**

- 不新增背景 timer、daemon、WebSocket/MQTT telemetry、歷史資料、SQLite 寫入或告警系統。
- 不改動 `/health`，避免把硬體探測加入便宜的 liveness probe。
- 不控制風扇轉速、不修改 thermal policy，也不支援遠端 reboot。
- 不把 CPU load average 改成另一種 CPU 使用率演算法。

## Decisions

### 按需讀取 Linux procfs 與 sysfs

server 僅在通過 trusted-management-read 檢查後，於 `/api/device/status` 的既有處理流程讀取少量文字檔。溫度優先選擇 type 為 CPU thermal 的 thermal zone，再回退到可解析的 thermal zone；風扇優先讀取 hwmon 的 RPM，沒有 RPM 時讀取 type 為 pwm-fan 的 cooling device state。

相較於背景採集與 cache，按需讀取不需要常駐 timer、額外記憶體、資料同步或持久化寫入，最符合省資源要求。代價是狀態只會在既有頁面載入或刷新時更新。

### 用 nullable 結構表達真實值與 unavailable

API 增加 `temperature` 與 `fan` 物件。`temperature` 包含 `available` 與 nullable `celsius`；`fan` 包含 `available`、`status`、nullable `rpm` 與 nullable `coolingState`。讀不到來源時回傳 unavailable/null，而不是 `0`，因為零度或零 RPM 都可能是有效但不同語意的量測。

相較於直接回傳單一 number，結構化狀態讓 web 不必猜測硬體不支援、權限失敗與真正停止之間的差異。

### 保留四張 gauge 並把風扇放入裝置資訊

現有資源區已是四欄 gauge，CPU、記憶體、磁碟與溫度正好佔滿。溫度卡改用真實 telemetry；風扇以裝置資訊列呈現 RPM、運轉/停止或 unavailable，避免為第五張 gauge 改動 FHD layout 與 CSS。

相較於重排資源卡，這是最小且可讀的 UI 變更，也避免風扇 cooling state 被錯誤包裝成百分比 gauge。

## Implementation Contract

- Behavior: 受信任使用者開啟或透過既有機制刷新 Device Status 時，CPU load、記憶體、磁碟、系統溫度與風扇狀態來自同一次 `/api/device/status` 回應。頁面不自行啟動新的週期輪詢。
- Interface: `/api/device/status` 的 `data.temperature` 為 `{ available: boolean, celsius: number | null }`；`data.fan` 為 `{ available: boolean, status: "running" | "stopped" | "unavailable", rpm: number | null, coolingState: number | null }`。既有 `cpu`、`memory`、`disk`、權限檢查與 success envelope 不變。
- Presentation: 溫度卡在可用時顯示攝氏值，在不可用時顯示 `Unavailable`；裝置資訊中的風扇列優先顯示 RPM，否則顯示運轉/停止與 cooling state，不可用時顯示 `Unavailable`。
- Failure modes: sysfs 路徑不存在、內容無法解析或讀取被拒絕時，該 telemetry 回傳 unavailable；單一硬體來源失敗不得使整個 status API 失敗，也不得回傳虛構數值。
- Acceptance: server focused tests 覆蓋溫度、RPM、cooling state 與 unavailable；web focused tests覆蓋溫度卡及風扇列的可用/不可用格式；`pnpm --filter @solar-display/server test src/routes/device.test.ts`、受影響 web tests 與 `pnpm verify` 通過。
- In scope: `device` route 的硬體讀取、現有 Device Status 型別/view model/rendering 與 focused tests。
- Out of scope: polling、歷史曲線、通知、風扇控制、部署設定與其他頁面。

## Risks / Trade-offs

- [不同 Linux image 的 sysfs 節點名稱不同] → 以 thermal type、hwmon fan input 與 pwm-fan cooling type 做有界候選搜尋，無匹配時保持 unavailable。
- [cooling state 不等於 RPM] → API 與 UI 分開表達 `rpm` 與 `coolingState`，不推算不存在的 RPM。
- [同步 filesystem 讀取增加 request latency] → 僅讀少量本機虛擬檔案，且只在受信任的 status request 發生時執行；不加入 `/health` 或背景迴圈。
- [頁面不輪詢會顯示載入時快照] → 接受此取捨以符合省資源要求，沿用既有載入與刷新入口。

## Migration Plan

不需要 DB migration 或設定變更。部署新 server/web build 後即可生效；舊 Pi image 若未暴露相容 sysfs 節點會安全顯示 unavailable。回滾時還原 server response 擴充與 web 顯示即可，既有欄位與資料不受影響。

## Open Questions

(none)
