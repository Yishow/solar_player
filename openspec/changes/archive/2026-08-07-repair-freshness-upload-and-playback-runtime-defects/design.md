## Context

一次跨 server / web / shared 的深度靜態分析找到 8 個既有缺陷。它們來源不同，但都屬於「已寫好的契約在實作中悄悄失效」這一類：4 項直接違反已歸檔 spec，2 項是安全與長期運行風險，2 項是資料保真度。

最嚴重一項已重現確認。`live_metric_values.timestamp` 有兩種寫入來源：

- MQTT 訊息處理與 mock feed 以 SQLite `CURRENT_TIMESTAMP` 寫入，格式為 `YYYY-MM-DD HH:MM:SS`，內容是 **UTC 牆鐘且不帶時區標記**。
- 廠區發電彙總以 MQTT payload 的 ISO 8601 字串寫入，帶 `Z`。

shared 的 freshness 計算對兩者一律 `Date.parse`。ISO 形式正確；無時區標記的形式會被 V8 當成本地時間，在 Asia/Taipei 得到比真實瞬間早 8 小時的結果，年齡因而被灌水 8 小時。realtime 類別的 historical 門檻是 30 分鐘，遠小於 8 小時，因此該路徑寫入的指標**恆為 `historical`**。

同 repo 的 MetricsAccumulator 在讀同一欄位時會補 `Z` 再解析，是正確作法。也就是說同一欄位目前存在兩套互相矛盾的解讀，相差一個時區偏移量。既有測試 fixture 一律以 ISO 字串灌資料，從未覆蓋 `CURRENT_TIMESTAMP` 格式，這是缺陷長期存活的原因。

## Goals / Non-Goals

**Goals:**

- 讓 freshness 年齡計算與伺服器時區無關，且對兩種既存時間戳格式都得到正確瞬間。
- 讓未經內容驗證的上傳格式即使被直接瀏覽也無法在應用 origin 執行 script。
- 讓 kiosk 裝置的 App Shell cache 占用有上界。
- 恢復 `display:sync` 的既有合併契約，使協調器存續不受 render 週期影響。
- 每項缺陷都有一個在修復前會失敗、修復後通過的迴歸測試。

**Non-Goals:**

- 不變更 `live_metric_values` 儲存格式，不做資料 migration。既有資料列不需改寫。
- 不觸碰 `metric_snapshots.captured_at` 的解析。該欄位存 local wall-clock，其不補時區標記的解析是刻意且正確的。此邊界必須在實作時嚴守。
- 不移除 `.svg` 上傳支援，不新增 SVG sanitizer 或 DOM 解析管線。
- 不改變 Effective Rotation 快取的淘汰策略。FIFO 與 LRU 的差異只影響命中率、不影響回傳內容。
- 不重新設計管理端 same-host origin 信任模型。
- 不改動任何 playback 頁視覺，因此不需要 fresh FHD witness batch。

## Decisions

### 在儲存讀取邊界統一正規化指標時間戳

在 server metrics 層新增單一時間戳正規化入口，將「UTC 牆鐘、無時區標記」形式補上時區標記後再交給下游，ISO 形式則原樣通過。讀取 live 指標快照時在該入口正規化一次，之後所有 freshness 計算都拿到明確帶時區的字串。

選這個位置而非其他兩種：

- **不改 shared 的 freshness 計算**：shared 是純函式層，它收到什麼字串就該信任什麼。把格式修補塞進 shared 會讓「無時區標記代表 UTC」這個只對 `live_metric_values` 成立的假設洩漏到所有呼叫端，並且會誤傷 `metric_snapshots` 那條刻意的 local wall-clock 路徑。
- **不改寫入端為 ISO**：需要 migration 才能處理既有資料列，且無法保證未來沒有新的 `CURRENT_TIMESTAMP` 寫入點；讀取端正規化對舊資料與新資料一併生效。

正規化函式必須是冪等的：對已帶 `Z` 或帶偏移量的字串不得重複附加。無法辨識的字串原樣回傳，交由下游既有的「無效時間戳視為 unavailable」路徑處理，不在此拋錯。

### 以 response header 中和上傳資產的 script 執行能力

對 `/uploads/` 前綴下服務的所有檔案加上 `X-Content-Type-Options: nosniff` 與 `Content-Security-Policy: sandbox`。`sandbox` 指令在無 `allow-scripts` 時會停用該 response 的 script 執行，同時不影響該檔案作為圖片被內嵌。

選 header 而非移除 `.svg`：既有品牌 logo 多為 SVG，移除格式支援會使既有資產失去往後可替換性；而 header 對**既有已上傳**的 SVG 同樣立即生效，移除格式支援則不會。兩者防禦強度在此情境相當，header 的破壞性較低。

同時修正 images 上傳路由拒絕訊息與允許清單不一致的問題 — 訊息宣稱只接受四種點陣格式，實際允許清單含 `.svg`。此不一致本身就是缺陷長期未被注意的原因之一。

### Service Worker 在啟用新 cache 時回收非現役 cache

在 App Shell cache 被提交為現役身分後，列舉所有以本專案 cache 前綴命名的 cache，刪除既非現役、亦非當前候選者的項目。回收發生在提交成功之後，確保任何時刻至少有一個完整可用的 cache。

選在提交後而非啟用時回收：啟用階段候選者尚未確認完整，此時刪舊 cache 會在提交失敗時留下無可用離線資產的空窗。

### 以穩定的 reload reference 修復 display sync 合併契約

播放控制器對外提供的 reload 函式目前是元件內的普通函式，每次 render 都是新 reference。消費端以它作為 effect 相依，導致協調器每次 render 被 dispose 並重建：落在 debounce 視窗內的事件會被清除而遺失，in-flight 合併狀態亦被清空，違反既有的 coalescing requirement。

將該函式改為在 render 之間保持穩定 reference，其內部讀取的變動值改由 ref 取得，使消費端 effect 只在真正需要時重建。同一修正順帶解決輪詢閉包鎖住掛載時 route 的問題 — reload 不再捕捉某次 render 的 route，而是在執行時讀取當下值。

不採用「讓消費端改用 ref 包裝 reload」：那只是把不穩定性推給每個消費端，新增消費端時會再次踩到；問題根源在提供端。

### 區分零值與未知值並讓單位比對大小寫無關

即時用電彙總目前以「大於零」作為是否回報的條件，使真實的 0 kW 被回報成 `null`。改為以是否有可用觀測值作為條件，0 為合法數值，僅在無觀測來源時回報 `null`。

功率加總的單位比對改為正規化後比較，使 `kW`、`kw`、`KW` 等寫法一致納入，避免對應被靜默排除。

## Implementation Contract

**Behavior**

- 一個剛由 MQTT 或 mock feed 寫入的即時指標，在 `GET /api/metrics/live`、socket `liveMetrics:update` 廣播、以及 rotation 與 readiness 的頁面新鮮度判定中，其 freshness 狀態為 `live`，年齡接近零。此結果在伺服器時區為 UTC 或 Asia/Taipei 時一致。
- 由廠區發電彙總寫入的 ISO 時間戳指標，其 freshness 結果不因本次變更而改變。
- 直接以瀏覽器開啟 `/uploads/` 下的任一資產時，response 帶有 `X-Content-Type-Options: nosniff` 與 `Content-Security-Policy: sandbox`；SVG 內嵌的 script 不執行。以圖片元素內嵌同一資產時仍正常顯示。
- images 上傳路由拒絕不支援格式時，訊息列舉的格式與實際允許清單一致。
- App Shell cache 提交為現役後，屬於本專案前綴但既非現役亦非當前候選的 cache 不再存在。現役 cache 於回收後仍完整可用。
- 一連串在單一 reload 視窗內抵達的相關 `display:sync` 事件，至多觸發一次額外 reload 週期；此性質在元件持續 re-render 期間維持成立。
- runtime 刷新後的 route 調和使用刷新當下的 route。
- 即時用電彙總在有觀測來源且總和為零時回報 `0`，僅在無觀測來源時回報 `null`。

**Interface / data shape**

- 新增的時間戳正規化函式接受 `string`、回傳 `string`；冪等；無法辨識的輸入原樣回傳。它不回傳 `Date`，也不拋錯。
- 既有 freshness 結果的欄位形狀不變；本次只改變其中年齡與狀態的數值正確性。
- `/uploads/` 的 response header 為新增，不移除或改寫既有 header。

**Failure modes**

- 無法辨識的時間戳字串維持既有語意：下游視為 unavailable，不拋錯、不記為錯誤日誌。
- Cache 回收失敗不得中斷提交流程，亦不得使現役 cache 進入不完整狀態；回收是盡力而為的清理。
- `display:sync` 協調器在 reload 失敗時維持既有行為，由播放控制器自行呈現錯誤狀態。

**Acceptance criteria**

- 一個以 SQLite `CURRENT_TIMESTAMP` 實際寫入、而非以 ISO 字串構造 fixture 的測試，斷言剛寫入的指標 freshness 為 `live`。此測試在修復前失敗。
- 一個測試在伺服器時區設為非 UTC 時仍得到相同結果，鎖住時區無關性。
- 一個測試斷言 ISO 時間戳路徑的結果未因正規化而改變。
- 一個測試斷言 `/uploads/` response 帶有兩個安全 header。
- 一個測試斷言 images 上傳拒絕訊息與允許清單一致。
- 一個測試斷言提交新 cache 後，過期 release 的 cache 已被刪除且現役 cache 仍可用。
- 一個測試在協調器存續期間持續觸發 re-render，斷言事件突發仍只產生一次額外 reload。
- 一個測試斷言零值用電回報 `0` 而非 `null`，以及大小寫不同的單位皆被納入加總。
- 交付 gate 為 `pnpm verify` 全綠。

**Scope boundaries**

在範圍內：上述 8 項缺陷的修復與其迴歸測試；為使測試能覆蓋而必要的既有測試輔助調整。

在範圍外：`metric_snapshots.captured_at` 的任何解析路徑；`live_metric_values` 的儲存格式與 migration；Effective Rotation 快取淘汰策略；管理端存取模型；SVG 內容 sanitize；任何 playback 頁的視覺調整；任何非本清單所列的缺陷 — 實作過程若發現新缺陷，記錄後另開 change，不併入本次。

## Risks / Trade-offs

- [正規化入口遺漏某條讀取路徑，使部分指標仍走舊解析] → 以「讀取 live 指標快照」為唯一正規化點，所有 freshness 消費端都經由該快照取得指標；測試涵蓋 rotation、readiness 與 API 三條下游。
- [實作時誤將正規化套用到 `metric_snapshots.captured_at`，破壞既有正確的 local wall-clock 語意] → design 與 tasks 均明列此為範圍外；該路徑既有註解已說明其語意，實作前必須先讀。
- [`Content-Security-Policy: sandbox` 影響 SVG 以圖片形式內嵌的既有顯示] → sandbox 停用的是 script 與同源特權，不影響圖片解碼；驗收條件明確要求內嵌顯示仍正常，若實測有異常則退回僅套用 `nosniff` 並改以移除 `.svg` 支援處理。
- [cache 回收誤刪現役 cache，使裝置離線後無資產可用] → 回收只在提交成功後執行，且明確排除現役與當前候選；測試斷言回收後現役 cache 仍完整。
- [穩定化 reload reference 時遺漏某個它讀取的變動值，造成讀到過期資料] → 改動時逐一檢視該函式讀取的每個外部值，變動值一律改由 ref 取得；既有 route 調和測試可捕捉此類迴歸。
- [本次一併修 8 項缺陷，範圍偏大，review 負擔集中] → 缺陷彼此獨立、無共用程式路徑，tasks 依缺陷切分並各自附測試，可逐項獨立 review 與回退。
