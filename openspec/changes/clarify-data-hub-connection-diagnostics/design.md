# Design: Connection diagnostics

## Context

讀取狀態與測試草稿是不同請求。現有 server PUT 先寫資料庫再啟動非同步 reconnect，回應中的 runtime status 不一定代表新設定已生效。正式連線、草稿與最近一次測試需要並存，而不是互相覆蓋。

## Goals / Non-Goals

讓使用者知道自己看的是哪個 Broker、哪份設定、何時的證據，以及下一步是檢查接收還是修連線。共用一份中央設定，不依 CL/KN 複製。只展示真的量測到的層級。

## Technical Approach

### D1. 操作優先版型

上方是一張緊湊「Solar Player 接收端 Broker（CL／KN 共用）」摘要：目標、資料模式、正式狀態、最後查核、受影響範圍；主捷徑「查看接收資料」。下方 7/5 或內容感知雙欄：左／主區為設定草稿（基本連線→驗證→進階），右／輔區為正式狀態與本次測試結果。窄寬時先正式摘要，再表單，再測試詳情；不可因兩欄等高而產生大片空白。

頁內三個動作：

| 文案 | 實際操作 | 不可暗示 |
|---|---|---|
| 更新目前狀態 | GET 現有 status | 不表示新草稿已測試 |
| 測試這份設定 | POST `/api/settings/mqtt/test` | 不保存、不發佈、不證明訂閱權限 |
| 儲存並套用連線 | PUT 設定＋觀察 runtime reconciliation | 不把 HTTP 成功當 Broker 已連上 |

若 onboarding 僅需要現有 Broker preflight，文案用「檢查目前連線」；只有真的呼叫 test 才用「測試」。已配置且授權時不逼使用者再填一次帳密。

### D2. 雙狀態與版本

正式狀態 = disconnected/connecting/connected/error/unknown；基於 server 真的回報，不能前端猜重新連線完成。草稿 = pristine/dirty/testing/tested/saving/saved-awaiting-runtime/error。測試結果保存 requestId、startedAt、completedAt、設定指紋、成功與可披露的錯誤；機密本身不進 logs/URL，指紋不能是可離線猜密碼的公開 hash。

前端 draft revision 用 opaque nonce/遞增 local sequence 即可；任何會影響測試的欄位變更，舊測試標示「設定已變更，需重新測試」。晚到 response 只更新對應測試記錄，不更新目前 draft 的有效結果。server 如提供跨 client test token，需用 opaque binding，且不能替代 save 時的授權/版本檢查。

失敗顯示：發生在哪份設定、時間、實際可知原因與下一步。API 只有通用 failure 時不細分 DNS/TLS。測試通過顯示「這份設定可建立連線；尚未套用」，保存成功但 runtime 未到位顯示「設定已儲存，正在確認正式連線」。

### D3. 共享影響與敏感欄位

管理 scope 即使 KN 也保留醒目「此設定為 Player 接收端的 CL/KN 共用；不變更上游發布端」。變更 host/port/auth/clientId/dataMode 前，save review 顯示改哪些非機密欄位與系統共用影響；若有進行中 capture，只能顯示已知 session 的影響或「接收工作可能需要重新開始」，不可假造精確數量。

密碼三態：沿用、替換、明確清除；`****` 只是既有遮罩，不是新密碼。現有 server 已支持 undefined/**** 保留、空字串清除，UI 以此保留契約，不回傳或復原明文。保留環境變數設定優先序；若保存後 effective settings 與 submitted settings 不一致，顯示可取得的覆寫原因或明示未能確認，不直接宣稱設定生效。

資料模式若為 mock，顯示「模擬資料模式」，不是正常 production reception。測試 client 必須使用不會踢掉正式 client 的隔離身份；進入 apply 時檢查 MqttClientService 實作與既有測試，不因 UI 提案就宣稱已經隔離。

### D4. 連到下一步

上下文連結以共用 allowlist URL builder 產生，保留 scope、合適的 task/return context；不把來源搜尋條件錯套到另一種 metric 搜尋。ConnectionStatusCard 的無 query `<a>` 替為 router navigation＋dirty guard。若回到來處的 onboarding，沿用草稿，不重啟整個流程。

## Architecture Decisions

不做看似炫麗、實際沒有證據的網路分段檢查動畫。清楚區分生效狀態與候選測試，比單顆綠色 Connected 更可診斷。Player 接收端保持單一共享連線；這不是全系統設定同步控制器。

## File Changes

ConnectionsView、ConnectionStatusCard、BrokerForm、MqttSettings/useMqttSettingsController 與 useMqttSettingsBroker、GuidedOnboardingPanel；必要時擴充 settings-mqtt response 的非敏感版本／effective-state evidence。新增 testVersion model 與 context link helper 可被其他 pages 復用。

## Risks / Trade-offs

再次測試提示不是強迫每次小型 label edit 都重測；只有 connection-affecting 欄位。不得將 HTTP timeout 解讀為保存未發生；未知結果交由讀回有效設定確認。自動重試只讀取，不盲目再次寫入。

## Migration Plan

先改動作文案與 context links；再引入 draft revision/result binding；最後接 saved-versus-effective state。若後端只知 connected boolean，顯示時間與「未確認此設定版本」而不是偽造 activating stages。

## Validation

測正式 A 連線正常但草稿 B 測試失敗、B 測試完成前使用者改成 C、mock、離線、auth failure、password keep/replace/clear、保存成功回應遺失、KN 跳 sources/metrics 與 dirty guard。以 spy 證明 test 不 publish，不變正式設定，不踢斷 runtime client。

## Open Questions

設定來源／effective config revision 的完整資料是否由 API 提供，需要 apply 前確認；不足時新增欄位或採明示 unknown，而不是由 UI 猜測。

## Cross-change contract

路由、四軸狀態、單筆API與重試期限的共用細節見 [STATE-AND-API-CONTRACTS](../../../docs/plans/data-hub-reception-ux/STATE-AND-API-CONTRACTS.md)。A–E的責任／交付順序見 [ROLLOUT-AND-ACCEPTANCE](../../../docs/plans/data-hub-reception-ux/ROLLOUT-AND-ACCEPTANCE.md)。

## 2026-09-15 跨發布端審查更新

本輪基準為 `fd405ebc2957232b6c622071622b9c7d830a3a42`。本 change 仍是未實作提案，不勾選產品驗收、不歸檔。與本輪新增的 `plan-power-mqtt-publishing-and-kn-onboarding` 共用 [MQTT-OWNERSHIP](../../../docs/plans/data-hub-reception-ux/MQTT-OWNERSHIP.md) 與 [PUBLISH-TAG-REGISTER](../../../docs/plans/data-hub-reception-ux/PUBLISH-TAG-REGISTER.md)。

### 更新決策與邊界

本頁只改 Solar Player 的接收端設定；不會修改 Broker 服務本身、solar_mqtt_go、opc_mqtt 或兩者 WebUI 的設定。發布端健康與本接收 client 狀態分開。

本輪具體實作責任與驗收由 DHC-R5 約束；不得把新增發布契約當作現行 API 已支援，也不將隔離 fixture 當現場測試。

## 2026-09-16 工程別修訂（取代舊 KN 逐錶前提）

只修改Player receiver原則不變。工程報表到件依各自排程，與MQTT連線、publisher存活和DDE健康分開；未定排程顯示unknown。

觀音結果契約由 [`add-kn-engineering-mqtt-sources`](../add-kn-engineering-mqtt-sources/proposal.md) 的 KNE/EPR 要求負責；本文件舊段落中的 DDE/physical/raw 與 F v1 前置僅適用明確選擇的物理來源，不得套成工程別必要條件。A 的焦點、B 的路由、C 的連線責任、D 的預覽及 E 的配置安全依原規格保留。需要逐來源核對的是工程成果模式與涵蓋範圍，不是上游每顆錶。
