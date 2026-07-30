## Context

前置條件為 Device／Group、secure pairing 與 Default Profile compatibility 均完成。現況的 factory scope 由全域 playback page enablement 推導，無法讓同 Profile 的 CL 與 KN Client 取得不同資料與 rotation。

## Goals / Non-Goals

**Goals:**

- 由 Credential 建立可信 Display Client Context。
- 以 Context 統一決定 Story、Readiness、Freshness 與 Effective Rotation 的 Site Scope。
- 重用 Profile＋Site 結果，並在安全播放邊界套用 site 變更。

**Non-Goals:**

- 不接受 query/header/front-end state 自報 site。
- 不實作 Profile Draft／Publish、per-device override 或離線 cache。
- 不改變五頁視覺語言或以 page-local hardcode 過濾資料。

## Decisions

### Resolve site only from authenticated Display Client Context

Fastify plugin 由 Cookie credential 解析 Device、Group、siteScope 與 profile identity。Runtime Story／Readiness／Rotation routes 只讀 request context。Management preview 的明確 site selection 留給 Phase 2 trusted route，不能混入 playback route。

### Project all site-sensitive data before rotation evaluation

Server 先依 siteScope 選擇 Factory Circuit page、Sustainability aggregate、Overview／Solar source keys與 readiness，再建立 Effective Rotation。Client 不再做第二次 site filter，避免 Preview、runtime 與 monitoring 分歧。

### Cache by profile state and site scope

Cache key 使用 profile id、profile updated/version identity、siteScope 與 readiness/freshness revision。最多形成少量共享 snapshot；Profile、site-relevant data 或 readiness change 時精準 invalidation。替代方案是 per-device cache，會造成 50 份等價結果。

### Apply context changes at the safe playback boundary

Client 收到 context revision 時不立即 reload。當前頁仍有效則完成剩餘 duration；無效則在下一個 transition tick 切至 start page，若 start page 無效則第一個有效頁。上限為目前頁剩餘 duration，不允許無界等待。

## Implementation Contract

**Behavior**

- 有效 CL 與 KN Device 使用同一 Profile 時，通用頁順序相同，Factory Circuit 與 site-sensitive data 嚴格隔離。
- unpaired 回 401 device_unpaired；revoked／disabled／group-invalid 回 403 對應 code，且不回退 CL 或 KN。
- readiness 不因另一 Site 缺資料阻擋本 Site。
- 相同 Profile＋Site request 重用 snapshot；50 Client 不觸發 50 次完整 evaluator。

**Interface / data shape**

- DisplayClientContext 含 deviceId、clientId、groupId、siteScope、profileId、contextRevision。
- Runtime response 回 context summary 與 effective rotation revision，便於 Client 判斷更新。
- Site scope 僅為 cl 或 kn。

**Failure modes**

- credential、Device、Group 或 Profile 任一失效即 fail closed。
- Context revision 更新期間舊 snapshot 可完成當前頁，但下一安全邊界必須採新結果。
- cache error 回到單次無 cache evaluation，不回傳跨 Site 舊資料。

**Acceptance criteria**

- Management API → Pairing → authenticated Story/Rotation integration seam 覆蓋兩 Site、停用與撤銷。
- Shared evaluator tests 覆蓋 page order、readiness skip、fallback 與 cache key。
- focused tests、pnpm test/build/verify 通過；五頁 fresh FHD witness、gap notes 與 evidence bundle 由使用者判定 intentional difference。

**Scope boundaries**

- In scope：server context、site projection、rotation cache、Client safe transition。
- Out of scope：管理 UI、Socket duplicate warning、Profile publishing、freshness policy UI。

## Risks / Trade-offs

- [既有未配對 Browser 將不能取得正式資料] → 提供明確 unpaired display state 與配對操作路徑。
- [cache invalidation 漏掉來源 revision] → contract tests 驗證 Profile、Site readiness 與 relevant data change 均改變 key。
