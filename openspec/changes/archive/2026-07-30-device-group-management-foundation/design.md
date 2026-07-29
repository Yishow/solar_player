## Context

Default Playback Profile 已提供後續 Profile reference 的資料基礎，但 Device 與 Group 尚不存在。此 change 以已完成並通過 repo verification 的 default-playback-profile-compatibility 為前置；若該 change 尚未收尾，先修正其 server suite 與 Spectra findings。

## Goals / Non-Goals

**Goals:**

- 建立穩定 Device Identity、扁平 Group、cl／kn Site Scope 與 Profile reference。
- 以既有 management mutation trust boundary 提供 CRUD。
- 讓後續 pairing 與 Display Client Context 只依一份關聯資料。

**Non-Goals:**

- 不建立 Pairing Token、Credential、Socket 身份或 Client playback context。
- 不提供階層式 Group、任意 Site、per-device override 或多 Profile governance。
- 不修改既有 Playback API response。

## Decisions

### Enforce one active group assignment in the relational model

Device 保存唯一 group_id；啟用 Device 只有在 Group 啟用且 Site Scope 為 cl 或 kn 時才具備可用配置。刪除仍被 Device 引用的 Group 回 409；停用 Group 使其 Device 成為 group-disabled，而非暗中搬到其他 Group。替代方案是多對多 membership，但會引入繼承歧義，故不採用。

### Reference the formal Playback Profile directly

Group 保存 playback_profile_id，Phase 1 建立 Group 時預設指向唯一 Default Profile。找不到 Profile 時 mutation 失敗，不建立 dangling reference。替代方案是保存 profile key 字串，但無法用資料庫外鍵保證一致。

### Reuse the existing management mutation boundary

Device／Group writes 走既有 managementAuth plugin；一般 playback session 與不可信 remote request 得到既有 403 envelope。此 change 不新增帳號、角色或第二套 token。

## Implementation Contract

**Behavior**

- clientId 與 Group name 全域唯一；空白或重複值回 400 或 409，不寫入半成品。
- Device create/update 回傳 id、clientId、displayName、enabled、groupId 與 resolved Group summary。
- Group create/update 回傳 id、name、enabled、siteScope 與 playbackProfileId。
- 啟用 Device 若未指定啟用 Group SHALL 被拒絕；停用 Device 可保留既有 Group reference。
- mutation 在 transaction 內完成，失敗時無部分寫入。

**Interface / data shape**

- Management routes 為 /api/devices 與 /api/device-groups。
- siteScope 僅接受 cl 或 kn。
- shared types 由 packages/shared/src/deviceIdentity.ts 匯出。

**Failure modes**

- 不可信 mutation 使用既有 management access denied envelope。
- Group 被引用時 delete 回 409 group_in_use。
- Profile 不存在、Group 停用或 Device 啟用但無 Group 時回具體 code。

**Acceptance criteria**

- migration idempotency test、Device／Group route integration tests、management trust tests 通過。
- pnpm --filter @solar-display/server test 指定新增 route test 通過，之後 pnpm test、pnpm build 與 pnpm verify 通過。

**Scope boundaries**

- In scope：SQLite schema、server service/routes、shared types。
- Out of scope：pairing、management UI、Socket、site-scoped Story／Rotation。

## Risks / Trade-offs

- [先建立資料模型會暫時沒有 UI] → 由後續 device-fleet-management-surface 消費公開 API。
- [Group 停用造成 Client 無正式 context] → 保留明確 group-disabled 狀態，不提供隱性 fallback。
