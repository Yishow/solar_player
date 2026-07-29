# Device-scoped Multi-site Playback

Status: ready-for-agent

## Problem Statement

目前 Solar Player 已能由單一 Windows Server 提供遠端 Raspberry Pi thin kiosk 播放，並已將中壢與觀音工廠迴路建模為不同的展示頁與資料範圍。然而，播放設定仍以 Server 全域設定為核心；當管理者啟用、停用或調整廠區相關頁面時，所有 Client 會共同受到影響，無法讓約 50 台播放電腦各自穩定地指定觀看中壢或觀音。

現有 display client heartbeat 能觀察目前 Socket 連線、route、page 與播放狀態，但 Socket ID 只代表一次連線，斷線後即消失，不能作為永久裝置身份。現場需要在管理端先建立可辨識的裝置，產生一次性配對網址，讓 Client 配對後長期保存身份；Server 再依裝置所屬群組解析廠區與 Playback Profile，產生該 Client 的 Effective Rotation 與廠區資料範圍。

現有播放設定亦需要由單筆全域資料演進為正式 Playback Profile 模型。第一階段即應建立正確資料模型並把既有設定遷移成 Default Playback Profile，但保留舊 Playback API 作為相容介面，避免裝置配對、廠區隔離與播放核心遷移在同一時間形成不可回復的大爆炸。

Client 所在區網沒有外網，也沒有 NTP Server。產品不需要修改 Raspberry Pi 作業系統時間，但播放排程、資料 freshness、離線快照年齡與畫面時間必須以同一個 Server 時間為準。時間同步需採最簡單的方法：沿用既有 Socket.IO，由 Server 廣播應用程式時間，Client 使用 monotonic elapsed time 延續，不新增 MQTT 時間 Topic、NTP、chrony 或高權限 Device Agent 控制能力。

使用者需要一套可由單一 Server 支援約 50 台 Client、可快速配對與分組、可完整隔離中壢／觀音資料、可安全演進 Playback Profile、可觀察裝置狀態，且在斷線與 Server 重啟情境下仍保持可預期播放與時間語意的方案。相關架構、遷移、部署、安全、時間協議與測試方式必須有清楚文件，不能只存在於工程師的腦內快取。

## Solution

建立 Device、Device Group、Site Scope 與 Playback Profile 四個正式領域概念。每台 Device 只能隸屬一個扁平 Device Group；Group 指定 `cl` 或 `kn` Site Scope，並指派一個可重用 Playback Profile。Server 驗證 Client 的 HttpOnly Device Credential Cookie 後建立可信的 Display Client Context，所有廠區相關 Story、Readiness 與 Effective Rotation 都從該 Context 解析，不接受前端自行宣稱 site。

管理端先建立具有人類可讀 `clientId` 的 Device，並產生短效、單次使用的 Pairing Token。Client 第一次開啟配對網址後，以 Pairing Token 換取長期 Device Credential；Credential 明文只在建立時出現，Server 僅保存 hash，Browser 以專用 Firefox Profile 保存 HttpOnly Cookie。重新配對可撤銷舊 Credential。相同 Device 暫時允許多個 Socket 連線，但管理端需依穩定 Device Identity 聚合，並對長時間、多來源的重複身份顯示警告。

第一階段建立正式 Playback Profile 資料模型，將現有播放設定與頁面順序遷移成 Default Playback Profile。既有 `/api/playback/settings`、`/api/playback/pages` 與相關介面暫時保留為 Default Profile 的 compatibility façade，不維持舊、新資料表雙寫。Playback Profile 負責內容播放行為；Site Scope、資料可信度、安全、時間同步與系統更新則維持清楚分離。

Server 在 Rotation Evaluation 前套用 Group Site Scope，並以 Profile、Site Scope、Readiness 與 Freshness 產生 Effective Rotation。中壢 Client 只會得到中壢工廠迴路與中壢資料範圍；觀音 Client 只會得到觀音工廠迴路與觀音資料範圍；共同頁面仍依 Profile 播放。對約 50 台 Client，不逐台重算獨立播放設定，而是重用 Profile 與 Site Scope 的有效結果。

第二階段加入多 Playback Profiles、Draft／Preview／Publish、不可變版本、全量發布、逐台 desired/applied version 狀態與一鍵回滾。Profile 變更、Site 變更、前端更新與時間恢復皆在 Safe Playback Boundary 套用，避免正常頁面播放到一半突然切換。

應用程式時間由 Server 透過 Socket.IO 在 Client 連線時立即傳送，並每 30 秒廣播。Signal 使用每次 Server Process 啟動重新產生的 Server Instance ID 與遞增 Sequence，避免重複或亂序訊息造成時間倒退。Client 以 Server Epoch 加 monotonic elapsed time 推算 App Time；業務時區固定為 Asia/Taipei，傳輸與持久資料使用 UTC instant。Client 未取得 Server Time 時仍可使用相對時間正常輪播，但凍結排程切換、freshness 升級與資料過期年齡。時間同步狀態併入既有 heartbeat。

離線能力在第二階段以 IndexedDB 保存 Device Profile、Rotation Snapshot、Freshness Policy 與 Last-known Metrics，以 Cache Storage 保存 App Shell 與已發布素材。最後成功資料可無限期保留，但必須依資料年齡以「資料延遲／非即時資料／歷史快照」逐級加強警示，完整顯示來源時間與過期年齡，並停止即時動畫與即時措辭。

## User Stories

1. As a 系統管理員, I want 由一台 Solar Player Server 服務約 50 台播放 Client, so that 我不必為中壢與觀音分別維護 Server。
2. As a 系統管理員, I want 每台 Client 擁有穩定且人類可讀的 Device Identity, so that 現場維運不必辨識短暫 Socket ID 或難讀 UUID。
3. As a 系統管理員, I want 在 Client 上線前先建立 Device, so that 我可以預先完成命名、群組與廠區配置。
4. As a 系統管理員, I want 為 Device 產生一次性配對網址, so that 現場安裝可快速完成且不把長期密鑰放在 URL。
5. As a 系統管理員, I want Pairing Token 具有有效期限且只能使用一次, so that 被複製或遺留的配對網址不能長期冒用。
6. As a 系統管理員, I want Pairing Token 與 Device Credential 在資料庫只保存不可逆 hash, so that 資料庫外洩不直接暴露可用密鑰。
7. As a kiosk Client, I want 配對成功後由 HttpOnly Cookie 保存 Device Credential, so that 前端 JavaScript 無法讀取長期密鑰。
8. As a kiosk Client, I want 使用專用 Firefox Profile 保存 Device Cookie, so that Client 重開機後不必重新配對。
9. As a 系統管理員, I want 重新配對時能撤銷舊 Credential, so that 退役或遺失的 Client 不再具有有效身份。
10. As a 系統管理員, I want 停用某個 Device, so that 該 Client 即使仍持有 Cookie 也不能取得正式播放資料。
11. As a 系統管理員, I want 查看 Device 的最後上線時間、目前 route、page 與播放狀態, so that 我能快速確認現場螢幕是否正常。
12. As a 系統管理員, I want 相同 Device 暫時允許多個 Socket 連線, so that Browser 重連或短暫殘留連線不會被誤傷。
13. As a 系統管理員, I want 相同 Device 長時間出現不同來源的多重連線時收到警告, so that 我能發現 Credential 被複製或裝置身份重複。
14. As a 系統管理員, I want 建立自由命名的扁平 Device Group, so that 可以區分中壢大廳、中壢辦公區、觀音大廳與觀音產線。
15. As a 系統管理員, I want 每台 Device 只能屬於一個 Group, so that 套用的 Site Scope 與 Playback Profile 沒有多重繼承歧義。
16. As a 系統管理員, I want Group 明確指定中壢或觀音 Site Scope, so that 同群組裝置使用一致的廠區資料。
17. As a 系統管理員, I want Group 指派可重用 Playback Profile, so that 中壢大廳與觀音大廳可共用相同內容策略而不複製設定。
18. As a 系統管理員, I want 第一版不提供任意 per-device override, so that 50 台 Client 不會逐漸產生無法追蹤的設定漂移。
19. As a 中壢觀看者, I want 工廠迴路頁只顯示中壢迴路, so that 不會看到觀音專屬部門與數值。
20. As a 觀音觀看者, I want 工廠迴路頁只顯示觀音迴路, so that 所有八個觀音槽位與數值保持正確。
21. As a 中壢觀看者, I want Sustainability 使用中壢資料範圍, so that 永續數值不會混入觀音資料。
22. As a 觀音觀看者, I want Sustainability 使用觀音資料範圍, so that 永續數值不會混入中壢資料。
23. As a 觀看者, I want Overview、Solar 與其他廠區相關內容遵循同一 Site Scope, so that 頁面之間不會出現廠區精神分裂。
24. As a 系統, I want Readiness 與 Freshness 依 Client Site Scope 評估, so that 不相關廠區的缺資料不會錯誤阻擋播放。
25. As a 系統, I want Effective Rotation 在 Server 端完成 Site Scope 過濾, so that Server Preview、Client 實際播放與監控結果一致。
26. As a 系統, I want 中壢與觀音 Client 共用非廠區專屬頁面, so that Profile 不需要複製兩份幾乎相同的清單。
27. As a 系統, I want 對相同 Profile 與 Site Scope 重用 Effective Rotation 結果, so that 50 台 Client 不必重複執行相同的完整計算。
28. As a 系統管理員, I want 第一階段即建立正式 Playback Profile 模型, so that 後續多 Profile 不必再次推翻資料結構。
29. As a 系統管理員, I want 現有播放設定遷移為 Default Playback Profile, so that 上線後的播放行為不因遷移而改變。
30. As a 現有管理介面, I want 舊 Playback API 繼續讀寫 Default Playback Profile, so that 第一階段不必一次改完所有呼叫端。
31. As a 系統, I want 避免舊、新播放資料雙寫, so that 不會產生兩份互相衝突的 source of truth。
32. As a 系統管理員, I want Playback Profile 保存啟用頁面與頁面順序, so that 不同展示用途可定義不同內容。
33. As a 系統管理員, I want Playback Profile 保存每頁停留時間與起始頁, so that Profile 能完整描述內容輪播。
34. As a 系統管理員, I want Playback Profile 保存 Autoplay、Loop 與播放排程, so that Profile 能描述完整播放行為。
35. As a 系統管理員, I want 資料 Freshness、安全、Credential 與時間同步維持全域政策, so that Playback Profile 不混入系統運作與安全責任。
36. As a 系統管理員, I want 第一階段管理頁能建立、編輯、停用與配對 Device, so that 50 台裝置可由同一入口維護。
37. As a 系統管理員, I want 第一階段管理頁能建立 Group 並指派 Site 與 Default Profile, so that 現場可快速完成中壢／觀音配置。
38. As a 系統管理員, I want 管理功能只允許可信 LAN、VPN、Tailscale 或既有 Management-trusted Session 存取, so that 一般 Playback Client 無法控制其他裝置。
39. As a 管理使用者, I want 第一版不必建立額外帳號系統, so that 在可信內網前提下先完成裝置管理閉環。
40. As a kiosk Client, I want Site Scope 變更在 Safe Playback Boundary 套用, so that 正常頁面不會播放到一半被切斷。
41. As a kiosk Client, I want 當前頁在新 Site Scope 無效時於最近安全邊界離開, so that 已改成觀音的螢幕不會繼續播放中壢迴路。
42. As a kiosk Client, I want Profile 更新在 Safe Playback Boundary 套用, so that 全量更新不造成 50 台螢幕同時閃爍。
43. As a 系統管理員, I want 第二階段以 Draft 編輯 Playback Profile, so that 未完成設定不會直接影響現場。
44. As a 系統管理員, I want Preview 分別顯示中壢與觀音 Effective Rotation, so that 發布前能驗證兩種 Site Scope。
45. As a 系統管理員, I want Preview 顯示被 Readiness、Freshness 或 Fallback 排除的頁面, so that 發布前能看見降級結果。
46. As a 系統管理員, I want Publish 產生不可變 Profile Version, so that 已發布內容可稽核且不被靜默修改。
47. As a 系統管理員, I want 發布後所有目標 Client 在安全邊界套用, so that 不需要逐台操作。
48. As a 系統管理員, I want 每台 Client 回報 Desired Version、Applied Version 與 Update State, so that 能知道發布是否真正抵達現場。
49. As a 系統管理員, I want 管理頁彙總已套用、等待、離線與失敗裝置數, so that 50 台發布狀態可快速判讀。
50. As a 系統管理員, I want 一鍵回滾至舊版本並建立新的線性版本, so that 故障可快速恢復且歷史不被改寫。
51. As a kiosk Client, I want Service Worker 在背景下載與驗證新 App Shell, so that 更新不阻塞目前播放。
52. As a kiosk Client, I want 新 App Shell 在 Safe Playback Boundary 啟用, so that 更新不在頁面中途刷新。
53. As a kiosk Client, I want IndexedDB 保存 Device Profile、Rotation Snapshot、Freshness Policy 與 Last-known Metrics, so that Server 暫時不可用時仍有結構化快取。
54. As a kiosk Client, I want Cache Storage 保存 App Shell、字型、圖片與已發布素材, so that Server 短暫離線時仍可顯示內容。
55. As a 觀看者, I want 離線後仍看到最後成功資料, so that 展示畫面不因短暫故障全部變成錯誤頁。
56. As a 觀看者, I want 最後資料永遠顯示完整來源時間, so that 不會把歷史快照誤認為目前數值。
57. As a 觀看者, I want 資料警示依年齡從資料延遲、非即時資料升級為歷史快照, so that 資料越舊，可信度提示越強。
58. As a 觀看者, I want 過期資料停止即時動畫、趨勢暗示與「目前」措辭, so that 視覺不會錯誤暗示即時性。
59. As a 系統管理員, I want Freshness Policy 使用 realtime、daily、cumulative 與 static 類別, so that 門檻管理不會變成逐 Metric 設定叢林。
60. As a 系統管理員, I want Freshness Policy 由 Server 全域管理, so that 50 台 Client 對相同資料使用一致判斷。
61. As a kiosk Client, I want 正常連線時接受 Server 權威 Freshness 判定, so that 所有螢幕呈現一致。
62. As a kiosk Client, I want 離線時以最後 Server Time 與 monotonic elapsed time 延續資料年齡, so that Freshness 在短暫離線期間仍合理推進。
63. As a kiosk Client, I want 連線時立即收到 Server Time Signal, so that 啟動後能快速取得應用程式權威時間。
64. As a kiosk Client, I want Server 每 30 秒廣播一次時間, so that 長時間播放仍可定期校準。
65. As a kiosk Client, I want 時間訊號使用 UTC instant 並指定 Asia/Taipei 業務時區, so that Client OS 時區不會改變排程與顯示。
66. As a kiosk Client, I want 每次 Server Process 啟動使用新的 Server Instance ID, so that Server 重啟後可以安全重設 Sequence。
67. As a kiosk Client, I want 同一 Server Instance 只接受較大的 Sequence, so that 重複或亂序訊號不會讓時間倒退。
68. As a kiosk Client, I want 以 performance monotonic clock 延續 Server Time, so that Pi 系統時鐘被校正或誤設時不影響 App Time。
69. As a kiosk Client, I want 啟動後尚未取得 Server Time 時仍正常輪播快取內容, so that Server 暫時離線不會讓螢幕停工。
70. As a kiosk Client, I want 未取得可信 Server Time 時凍結排程、Freshness 升級與過期年齡, so that 不可信 Pi 時鐘不會驅動絕對時間邏輯。
71. As a kiosk Client, I want 未取得 Server Time 時仍使用相對時間進行每頁倒數, so that Autoplay 與 Loop 能持續運作。
72. As a kiosk Client, I want 漏掉三個廣播週期後標記 Time Signal 為 stale, so that 短暫漏訊與真正中斷可區分。
73. As a kiosk Client, I want Time Signal stale 但未超過 30 分鐘時繼續 monotonic 推算, so that 短暫斷線不立即凍結所有絕對時間功能。
74. As a kiosk Client, I want 超過 30 分鐘未收到 Time Signal 時進入 time-untrusted, so that 長時間推算不再被當成權威。
75. As a kiosk Client, I want time-untrusted 時凍結排程、Freshness 與過期年齡，但保持相對輪播, so that 行為保守而畫面不中斷。
76. As a kiosk Client, I want 重新收到 Server Time 時先更新內部時間並在安全邊界套用畫面結果, so that 恢復同步不會突然腰斬頁面。
77. As a 系統管理員, I want Heartbeat 回報 waiting、synced、stale 或 time-untrusted, so that 管理頁能看見每台 Client 的 App Time 健康度。
78. As a 系統管理員, I want 時間同步不修改 Raspberry Pi OS Clock, so that 不需要 NTP、chrony、Root Agent 或額外高權限服務。
79. As a 維運人員, I want 部署文件說明 Server 系統時間必須由現場人員維持正確, so that App Time 一致不會被誤解成外部標準授時。
80. As a 維運人員, I want 架構、資料遷移、配對、安全、時間協議、離線策略與測試矩陣都有正式文件, so that 後續維護不依賴原作者記憶。

## Implementation Decisions

- 使用一致的 domain vocabulary：Device、Device Identity、Device Group、Site Scope、Playback Profile、Default Playback Profile、Effective Rotation、Pairing Token、Device Credential、Display Client Context、Safe Playback Boundary、Server Time Signal、Time Sync State、Last-known Snapshot。
- Device Identity 是永久裝置身份；Socket Connection 是暫時連線。Liveness Registry 必須以 Device Identity 聚合零到多個連線，而不是把 Socket ID 當成裝置主鍵。
- Device 使用人類可讀且唯一的 `clientId` 與 `displayName`。Device 可停用，且必須隸屬恰好一個啟用 Group 才能取得正式播放 Context。
- Device Group 採扁平模型，不做父子繼承。Group 明確保存 Site Scope 與 Playback Profile reference。第一版不支援任意 Device override。
- Site Scope 第一版只有 `cl` 與 `kn`。所有廠區相關 Story、Aggregate、Readiness、Freshness 與 Rotation 都必須從 Display Client Context 解析，不接受 query parameter 或自訂 header 作為權威 Site。
- 管理端建立 Device 後產生短效、單次使用的 Pairing Token。Token 交換成功後立即標記已使用，並簽發 opaque Device Credential。
- Pairing Token 與 Device Credential 只保存 hash。Device Credential 透過 HttpOnly、SameSite Cookie 傳遞；正式 HTTPS 部署時加入 Secure 屬性。
- Raspberry Pi kiosk 改用專用 Firefox Profile 保存 Cookie，不再依賴 private window 的暫時儲存。Profile 不與一般瀏覽用途共用。
- 重新配對可撤銷既有 Credential。第一版預設一個 Device 只有一個有效 Credential，但允許該 Credential 出現短暫多 Socket Connection。
- 重複身份偵測聚合 Device Identity、Credential 與連線來源。短暫同來源重連不阻擋；長時間不同來源同時在線顯示管理警告。
- 第一階段即建立正式 Playback Profile 及 Profile Page 關係。既有播放設定與 registry 中的頁面順序、啟用狀態、停留時間遷移為 Default Playback Profile。
- 舊 Playback API 暫時成為 Default Playback Profile 的 compatibility façade。相容層與正式 Profile service 共用同一份資料，不實作舊、新資料表 dual-write。
- Playback Profile 保存內容播放行為：頁面 membership、順序、停留時間、起始頁、Autoplay、Loop 與 Schedule。Transition、Freshness、安全、時間與 Client 更新政策維持全域。
- Effective Rotation 在 Server 端由 Playback Profile、Site Scope、Readiness 與 Freshness 合成。Client 只播放 Server 已決定的結果，不進行第二次 Site 過濾。
- Effective Rotation 計算以 Profile Version 與 Site Scope 為主要 cache key；約 50 台 Client 引用少量共享結果，而非維護 50 套播放設定。
- Story 與 Rotation request 由可信 Device Credential 建立 Display Client Context。未配對、停用、被撤銷或無有效 Group 的 Client 得到明確的未配對／停用展示狀態，不默認回退到任一廠區。
- Profile 或 Site 變更使用 Safe Playback Boundary。當前頁仍存在於新結果時完成當前頁；當前頁不再有效時在最近可控邊界切換至新 Profile 起始頁或第一個有效頁。
- 第二階段新增 Draft、Preview、Publish 與 immutable Profile Version。Preview 必須同時產生 CL 與 KN Effective Rotation，以及 skip、fallback 與 readiness 診斷。
- Publish 直接指派新 Desired Version 給所有目標 Group，不做 Canary。Client 在 Safe Playback Boundary 更新 Applied Version，Heartbeat 回報 desired、applied、waiting、failed 等狀態。
- Rollback 不改寫舊版本；系統建立一個內容等同目標舊版本的新發布版本，使歷史保持線性。
- 管理功能第一版沿用既有 Management-trusted 信任邊界，僅允許可信 LAN、VPN 或 Tailscale。第一版不新增帳號、角色或雙人審核；能進管理介面的使用者可執行管理操作。
- 第二階段使用 IndexedDB 保存結構化離線狀態，Cache Storage 保存 App Shell 與素材。Service Worker 背景取得更新並在 Safe Playback Boundary 啟用。
- Last-known Metric 可無限期保存，但 UI 必須使用來源 timestamp，而非載入時間。資料越舊，提示從 delayed、stale 升級為 historical；即時動畫與即時措辭在非 live 狀態停用。
- Freshness Policy 使用 realtime、daily、cumulative 與 static 類別，由 Server 全域設定。正常連線時 Server 是權威；離線時 Client 使用最後權威時間與 monotonic elapsed 推進，直到 App Time 進入 time-untrusted。
- Server Time Signal 走既有 Socket.IO，不新增 MQTT Topic、NTP、chrony 或 Device Agent 寫入能力。Server 在新連線後立即 emit，並以 30 秒固定週期廣播。
- Server Time Signal 包含 Server Instance ID、Sequence、UTC Epoch、Asia/Taipei 時區識別與 Broadcast Interval。Server Instance ID 每次 Process 啟動重新產生，Sequence 在同一 Instance 內遞增。
- Client 對同一 Instance 只接受較大的 Sequence；Instance 改變時接受新基準並重設 Sequence。這允許 Server 重啟及人工向前或向後修正系統時間。
- Client 的 App Time 由最後 Server Epoch 加 `performance.now()` elapsed 推算。Client OS Clock 與 OS Timezone 不作為播放排程、Freshness 或畫面時間的權威來源。
- Time Sync State 為 waiting、synced、stale、time-untrusted。Stale 門檻自動等於三個 Broadcast Interval；time-untrusted 預設為最後有效 Signal 後 30 分鐘。
- Waiting 與 time-untrusted 狀態仍執行相對時間輪播，但凍結 Schedule transition、Freshness escalation 與 age calculation。重新同步後先更新內部權威時間，再於 Safe Playback Boundary 套用影響播放的結果。
- Heartbeat 擴充 Device Identity、Group／Site 摘要、Desired／Applied Profile Version、Update State 與 Time Sync State；Heartbeat payload 維持小型且固定週期。
- Phase 1 交付 Device／Group／Pairing、正式 Default Playback Profile、Site-scoped Effective Rotation、基本管理狀態、Server Time Signal、相容 API 與完整文件。
- Phase 2 交付多 Profile、Draft／Preview／Publish、Version／Rollback、desired/applied rollout、Freshness 管理、Service Worker、IndexedDB／Cache Storage 與完整離線快照體驗。
- 文件至少涵蓋：架構與 domain vocabulary、資料遷移、API compatibility lifecycle、配對與 Credential、Site data isolation、Server Time Signal、離線與 Freshness、Windows Server／Pi thin kiosk 部署、故障排除與 50 Client 測試矩陣。

## Testing Decisions

- 測試只驗證外部可觀察行為與持久結果，不對私有 class 結構、SQL 字串、內部 callback 次序、timer 實作或 cache container 做脆弱斷言。
- 主要測試 seam 之一是「Management API → Pairing → Authenticated Playback Request」。測試透過公開管理介面建立 Group 與 Device、產生 Pairing Token、完成 Cookie 配對，再以該 Credential 呼叫正式 Playback／Story API，驗證 Device Context、停用、撤銷、重新配對與錯誤狀態。
- 第二個主要 seam 是「Profile + Site Scope → Effective Rotation + Story」。測試建立同一 Default Profile、CL Group 與 KN Group，以不同 Device Credential 呼叫相同公開 API，驗證共同頁面一致、工廠迴路不同、Sustainability／Overview／Solar 資料隔離、Readiness 不跨廠阻擋，以及 Compatibility API 仍讀寫 Default Profile。
- 第三個主要 seam 是「Socket Connection → Server Time Signal → Client Runtime／Heartbeat」。測試連線立即取得時間、週期廣播、Sequence 去重、Server Instance 變更、waiting／synced／stale／time-untrusted、monotonic 推進、重新同步與 Safe Playback Boundary；最後只從 heartbeat 與公開播放行為判定結果。
- 三個 seam 已是本功能的最高穩定邊界。資料表 migration、Cookie attribute、rotation evaluator、time state reducer 等可有窄 contract tests，但不能取代上述端到端行為 seam。
- 優先沿用現有 Fastify inject + temporary SQLite route integration pattern，建立真實 migration、seed、request、response 與 socket side effect 的可重複測試。
- 優先沿用現有 Shared Rotation Evaluator 測試，驗證 page order、disabled、out-of-schedule、readiness skip、fallback 與未知診斷原因；新增 Site Scope 與 Profile Version 輸入時保持純外部 contract。
- 優先沿用現有 Fake Socket.IO server／socket 測試，驗證 connection room、heartbeat validation、Device Identity aggregation、time signal emission 與 disconnect behavior。
- 優先沿用現有 Client Heartbeat Loop 測試，驗證 connected／disconnected、立即 heartbeat、固定週期、Time Sync State 與 applied version payload。
- 優先沿用現有 Display Story page-scoped fixture，對 CL／KN circuit slots、metric keys、Sustainability aggregates 與 source timestamp 進行 API 層隔離驗證。
- Pairing tests 驗證 Token expiration、single-use、wrong Device、hash persistence、Credential rotation、revocation、disabled Device 與 Cookie missing／invalid；測試不得從資料庫取出明文 Token 或 Credential。
- Compatibility migration tests 從既有 seeded global playback state 啟動 migration，只透過舊 API 與新的 Profile API 驗證 Default Profile 內容完全等價，並證明不存在兩份可獨立修改的設定。
- Safe Playback Boundary tests 使用可控制的 monotonic clock 與目前 page，驗證 Site、Profile、App update 與 Time recovery 不在不安全時點切換，並驗證當前 page 失效時的 bounded transition。
- Load harness 至少模擬 50 個已配對 Client 的 Socket connection、10 秒 heartbeat、30 秒 time broadcast、同時 reconnect、global profile sync 與 CL／KN rotation request。驗收重點是 bounded request rate、無 N 倍重算、無 event storm、無記憶體無界增長。
- Duplicate Identity tests 模擬同 credential 同來源短暫雙 connection 與不同來源長期 connection，驗證前者不阻擋、後者在管理狀態產生明確警告。
- Phase 2 rollout tests 驗證 Publish 立即建立 Desired Version、離線 Client 不阻擋其他 Client、恢復連線後補套用、失敗保留上一個 Applied Version，以及 rollback 建立新線性版本。
- Offline tests 在已完成快取後停止 Server，驗證 App Shell、素材、Rotation Snapshot 與 Last-known Metrics 可讀；在 Browser 重新啟動且無 Server Time 時，驗證相對輪播繼續而絕對時間邏輯凍結。
- Freshness UI contract tests 驗證 live、delayed、stale、historical 的文字與語意，不依賴特定 CSS class；非 live 狀態不得顯示即時動畫或「目前」語意，並必須顯示來源時間。
- Deployment verification 擴充 thin kiosk runbook 與安裝驗證：專用 Firefox Profile 存在、配對 Cookie 可跨重啟、Server URL 可達、Socket Time 可收到、Client heartbeat 含 Device 與 Time 狀態。Device Agent 維持唯讀。
- 每個實作 slice 先執行最窄的 route／shared／socket／client contract tests，再執行 server 與 web 完整測試、build 及部署腳本驗證。涉及 Browser 離線與 Service Worker 時追加真實 Browser 測試。

## Out of Scope

- 不為中壢與觀音部署兩台獨立 Solar Player Server。
- 不建立每台 Device 一套獨立且可漂移的 Playback Settings。
- 不以 IP、hostname、Socket ID 或 Browser-generated UUID 作為正式 Device Identity。
- 不讓 Client 透過 query parameter、header 或前端狀態自行宣稱 Site Scope。
- 不讓一般 Playback Client 進入 Management API 或修改其他 Device 設定。
- 第一版不建立帳號密碼、SSO、角色權限或雙人發布審核。
- 第一版不提供階層式 Group 或任意 per-device override。
- 第一版不提供多 Playback Profiles、Draft／Publish／Rollback 完整治理；這些屬於 Phase 2，但 Phase 1 資料模型必須預留正式 Profile 概念。
- 不維持舊 Playback 資料表與新 Profile 資料表的 production dual-write。
- 不在時間同步中使用 MQTT Broker、MQTT over WebSocket 或 Browser MQTT Credential。
- 不安裝或配置 Windows NTP Server、chrony、systemd-timesyncd 或 GPS 授時。
- 不修改 Raspberry Pi OS Clock，也不讓唯讀 Device Agent 取得設定系統時間的 Root 能力。
- 不宣稱 Server Time 等同外部標準時間；現場仍需依部署 Runbook 維持 Windows Server Clock 正確。
- 不在第一階段交付完整 Service Worker 離線更新、IndexedDB 資料庫、Cache Storage 素材治理與 Freshness 管理 UI；這些屬於 Phase 2。
- 不因短暫多 Socket Connection 立即踢除舊連線；第一版只聚合並對可疑長期重複身份告警。
- 不做 Canary 或自動分批 Profile 發布；Phase 2 Publish 直接全量指派並依逐台狀態與 Rollback 控管風險。
- 不在規格中固定實作檔案路徑、class 名稱或內部函式結構；實作者需依當時 Codebase seam 放置模組。

## Further Notes

- 建議實作順序為：正式 Default Playback Profile migration 與 compatibility façade → Device／Group 資料模型與管理 API → Pairing／Credential 與專用 Firefox Profile → Display Client Context → Site-scoped Story 與 Effective Rotation → Identity-aware heartbeat 與管理狀態 → Socket.IO Server Time → Phase 1 管理 UI 與 runbooks → 50 Client 驗證 → Phase 2 Profile 治理與 offline cache。
- Phase 1 的核心驗收不是「管理頁看起來完成」，而是兩個已配對 Client 使用同一 Profile 時，可以穩定得到不同 Site Scope 且不互相改動設定。
- 約 50 台 Client 的主要風險不是 Socket 或 Heartbeat 流量，而是設定更新後同時 reload、素材首次下載與重複計算。實作應使用共享 Effective Rotation snapshot、HTTP 素材快取與 bounded reconnect，避免驚群效應。
- Time Signal 刻意保持簡單。它是 Solar Player 的應用程式時間協議，不是精密授時或 OS 校時服務。30 秒廣播與 monotonic 延續足以支援播放排程、Freshness 與展示時間。
- 現有 Device Agent 維持 read-only。新增功能不應偷偷把它變成遠端 Root 控制器。
- `ready-for-agent` 表示本 spec 已包含必要產品決策與測試 seam；實作前仍應依專案既有 OpenSpec 流程將 Phase 1 與 Phase 2 拆成可獨立驗證的 changes 與 tracer-bullet tickets。
