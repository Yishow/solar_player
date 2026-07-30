## Why

Default Profile foundation 能支援 Phase 1，但無法安全編輯、預覽與稽核多個播放策略。Phase 2 需要 Draft、immutable Version、Publish 與線性 Rollback，才能讓管理者在不直接改動現場內容的前提下治理 Profile。

## What Changes

- 提供多 Playback Profile CRUD；Group 可引用可重用 Profile，但不新增 per-device override。
- Draft 編輯完整保存 page membership、order、duration、start page、Autoplay、Loop 與 Schedule。
- Preview 同時產生 CL 與 KN Effective Rotation，列出 readiness、freshness、skip 與 fallback 診斷。
- Publish 從 Draft 建立 immutable Profile Version；已發布版本不可原地修改。
- Rollback 不改寫歷史，而以指定舊版本內容建立新的線性版本。
- 既有 Playback API 持續作為 Default Profile compatibility façade，不建立 legacy/new dual-write。
- 管理介面提供 Draft、Preview、Publish 與 Rollback 操作，但不在此 change 追蹤逐台 applied 狀態。

## Capabilities

### New Capabilities

- versioned-playback-profile-governance: 定義多 Profile、Draft、Preview、immutable Publish 與線性 Rollback。

### Modified Capabilities

(none)

## Impact

- Affected specs: versioned-playback-profile-governance
- Affected code:
  - New: apps/server/src/db/migrations/031_playback_profile_versions.sql, apps/server/src/services/playbackProfileGovernanceService.ts, apps/server/src/routes/playback-profiles.ts, apps/server/src/routes/playback-profiles.test.ts, packages/shared/src/playbackProfileVersion.ts, apps/web/src/pages/PlaybackProfiles/index.tsx, apps/web/src/pages/PlaybackProfiles/viewModel.ts
  - Modified: apps/server/src/app.ts, apps/server/src/services/playbackProfileService.ts, packages/shared/src/index.ts, apps/web/src/app/router.tsx, apps/web/src/services/api.ts
  - Removed: none
