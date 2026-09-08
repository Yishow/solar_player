## Context

動機與 R1–R4 見 proposal.md 及 review report。現有 mapping apply 已有資料庫交易、preview token、目標快照與 idempotency receipt；舊 topics PUT 會呼叫 runtime subscribe，新 apply route 不會。正式 onboarding 沒有樣本交接，capture 僅有記憶體清冊與被動 tap；功率來源則在 selector 之前返回 legacy 分支。

## Goals / Non-Goals

**Goals:** 接通既有能力，讓同一次操作的來源身分、selector、儲存結果、訂閱狀態與實際封包一致，並有可從正式入口重現的測試。

**Non-Goals:** 不更換 MQTT 套件，不重建來源 registry，不新增協定，不將 capture/offline 樣本當作正式讀值，不修改 managed Solar ownership。

## Decisions

### 1. 資料保存與 broker 啟用分兩階段

保留 `applyGuidedMapping` 的原子交易。route 在交易完成後，從已保存且 enabled 的 mapping 重新取得 desired topics，委派既有 `MqttClientService.subscribe` 的訂閱協調；不直接對 broker 建立另一份 production 訂閱清單。回應保留 `applied`，另增加明確的 activation 狀態（active、pending、failed）與可重試原因。active 只表示收到訂閱確認，不代表已有資料或月基準。

同一 idempotency key 重試先回放保存結果，再嘗試必要的 runtime reconciliation；不得因 receipt 已存在而永遠略過訂閱，也不得重建來源版本。拒絕把網路 await 放在 SQLite 交易內；broker 失敗不抹去已提交的設定。重試、重新連線與停用來源都由同一 runtime owner 協調，保留 managed adapter filters。

### 2. Selector 先解析，再依量測種類分流

抽出或沿用 shared selector 的正規化／解析結果，讓 power-gauge 與 energy 使用相同 path、tag、ambiguity 與 decimal 規則。energy 沿用 E1 transport gate；power 走帶正確單位、倍率及時間證據的 live 寫入，不進入 accepted energy history。legacy scalar mapping 只經相容 adapter，不以 measurementKind 判斷是否跳回舊 parser。

替代方案「把功率也送進 kWh ingest」會破壞單位與用電歷史，因此排除。不能只修 preview 或只修改測試 fixture。

### 3. 由正式父層管理 capture 與選取草稿

Onboarding 的父層保存 concrete site、connection reference、capture/sample identity、selected topic 與來源語意，透過現有 capture APIs 取得證據後交給欄位選擇器。補上 sample inspection 的受權限保護回應；只在記憶體的有界 session 保存必要樣本與 transport evidence，過期回明確錯誤。沿用既有 M1 API 契約與限額，不在 URL、localStorage 或普通 log 保存 payload。

未映射 Topic 不在 production subscriptions 時，啟動真正的獨立短期 discovery client；批准範圍來自授權設定，不靠 `cl/kn` 字樣猜測。feature off、未批准範圍、broker refusal、silent grant 分別顯示。stop/expiry/shutdown 釋放 discovery client，絕不 unsubscribe production。離線樣本要標示且不能使來源 online。

### 4. 發送確認綁定真實目標

測試發送先由 server 解析現有 connection、mapping 與所選值，產生短效確認資料，包含 target revision／fingerprint、exact topic、payload 與 retain=false。UI 顯示同一份內容，確認提交後 server 重新核對目標與 payload；變更則拒絕並要求重新確認。不能只把前端顯示文字改成另一個猜測 Topic。

新增確認欄位採 additive API 演進，升級 onboarding 呼叫端；所有既有 publish 呼叫端須列入相容測試，不能在此修復中默默停用或放寬其權限。正式資料值由使用者輸入及審查，不保留固定 10000.125 一鍵送入正式電錶的捷徑。

## Risks / Trade-offs

- 已保存但未啟用 → 以可重試狀態明示，防止使用者重複新增來源。
- Discovery 負載或機密 payload → 沿用 session/instance budgets、遮罩、授權與過期策略，測試被動 tap 不阻塞 ingest。
- 共用 selector 改到 legacy scalar 行為 → 加入 scalar、tag、array、缺欄位、重複 tag、power/energy 的完整回歸矩陣。
- 來源修改競態 → 保留原 preview stale/source revision 防護；發送確認另綁定實際 target，而非只信 client 的 confirmed=true。

## Migration Plan

優先 additive 回應與受控 capture；若需要新增 token 或 reception 設定儲存，於 apply 對照最新 migration 編號，不在提案預占編號。先跑隔離 fake broker／測試 DB；現場測試發送、部署與正式資料回填不在授權範圍。回退關閉新增導引／discovery，保留已保存來源與原始讀值，不刪除正式訂閱或 broker retained messages。

## Verification Strategy

先新增 R1–R4 失敗測試，再實作。route 測試必須檢查 subscription 呼叫與拒絕後 retry；power 測試必須從 runtime packet 路徑驗證結果；UI 測試由 TaskHome 正式入口走到 apply，不只 render 有 payload props 的子元件。測試發送以 stub/fake broker 記錄零或一次 publish，不碰現場。最後跑受影響 shared/server/web 測試與 `pnpm verify`；必要畫面驗收仍由使用者決定。
