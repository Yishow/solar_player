## Context

此前置為 Default Playback Profile compatibility 已完成且無 dual-write。Phase 2 在正式 profile tables 上增加多 Profile、Draft、Preview、immutable Version、Publish 與線性 Rollback；逐台 rollout 由下一個 change 負責。

## Goals / Non-Goals

**Goals:**

- 安全編輯與預覽多個 Playback Profiles。
- Publish 產生不可變版本，Rollback 保持線性歷史。
- 保留 Default Profile compatibility façade。

**Non-Goals:**

- 不提供 per-device override、階層 Group、canary 或逐台 applied tracking。
- 不改寫已發布版本、不回復 legacy dual-write。
- 不在此 change 建立 offline cache。

## Decisions

### Separate mutable draft from immutable version snapshots

playback_profiles 保存 identity；每個 Profile 只有一份 mutable draft，Publish 將完整 settings/pages/schedule snapshot 寫入不可變 version rows。runtime 不直接讀 draft。替代方案是 in-place version flag，容易靜默改寫歷史。

### Preview both site scopes without assigning devices

Management-trusted preview 以 draft snapshot 分別評估 cl 與 kn，回傳 effective pages、skipReason、fallback 與 readiness/freshness diagnostics。Preview 不寫 desired/applied state，也不接受 playback session 使用任意 site。

### Publish and rollback append to one linear history

Publish 以 optimistic draft revision 防止 stale save，成功後遞增 version number。Rollback 選既有 version，但建立內容相同的新 version，附 rollbackFromVersionId；舊版本永不更新。

### Keep legacy routes bound to Default Profile

既有 /api/playback/settings、pages、rotation-plan 繼續讀寫 Default Profile draft-compatible current configuration，共用同一 Profile service。多 Profile API 不另建 persistence path。

## Implementation Contract

**Behavior**

- 管理者可建立、rename、archive 非 Default Profile；被 Group 引用者不可刪除。
- Draft 保存完整 playback behavior，stale revision save 回 409。
- Preview 固定同時回 cl/kn，包含 configured、effective、skipped 與 diagnostics。
- Publish 建立 immutable version；重新讀舊 version 內容不變。
- Rollback 建立新 version 並保留來源連結。

**Interface / data shape**

- Management routes：/api/playback-profiles、/:id/draft、/:id/preview、/:id/publish、/:id/rollback。
- Version snapshot 包含 profile settings、ordered pages、schedule、createdAt、createdBy context 與 rollbackFromVersionId。
- shared types 由 playbackProfileVersion 匯出。

**Failure modes**

- stale draft 回 409 profile_draft_conflict 並附 currentRevision。
- 無有效頁、invalid start page 或 schedule invalid 時 Publish 回 400，不建立 version。
- Group in use 的 archive/delete 回 409。

**Acceptance criteria**

- migration、service、route integration tests 覆蓋 Draft/Preview/Publish/immutability/Rollback/compatibility。
- management UI tests覆蓋 stale save、CL/KN preview與 publish confirm。
- server/web/shared tests、build、pnpm verify 通過。

**Scope boundaries**

- In scope：profile governance schema/service/API與 management UI。
- Out of scope：desired/applied rollout、Client safe update、offline cache。

## Risks / Trade-offs

- [完整 snapshot 重複資料] → Profile 數量少，換取可稽核與簡單 rollback。
- [Default API 與 Draft 語意混淆] → compatibility route 明確只對 Default Profile current configuration，version runtime另由 rollout change接手。
