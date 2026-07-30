## 1. Schema 與 Draft TDD

- [x] 1.1 先為 Manage reusable Playback Profiles and mutable Drafts、Publish immutable Profile Versions、Roll back by appending a new linear Version 寫 failing migration/service tests；驗證 stale revision、immutability、invalid publish與rollback linkage。
- [x] 1.2 實作 Separate mutable draft from immutable version snapshots，使 Profile/Draft/Version migration可重跑且runtime不讀unpublished Draft；以 migration與service contract tests驗證。

## 2. Preview、Publish 與 compatibility

- [x] 2.1 實作 Preview both site scopes without assigning devices 與 Preview both Site Scopes before Publish，回傳cl/kn configured/effective/skipped/diagnostics且不寫desired state；以route integration tests驗證。
- [x] 2.2 實作 Publish and rollback append to one linear history，使Publish遞增Version、Rollback建立新Version且舊資料不變；以snapshot deep-equality tests驗證。
- [x] 2.3 實作 Keep legacy routes bound to Default Profile 與 Preserve the Default Profile compatibility facade，使既有Playback APIs共用Profile service且無dual-write；以legacy divergence integration test驗證。
- [x] 2.4 [P] 匯出 shared Profile Version contracts並建立Management API client；以pnpm run build:shared與API tests驗證。

## 3. Management UI 與整體驗證

- [x] 3.1 實作Profile list/Draft/CL-KN Preview/Publish/Rollback UI，行為覆蓋所有governance requirements；以web component tests驗證stale save、invalid publish與confirmation。
- [x] 3.2 執行focused migration/server/web tests、pnpm test、pnpm build、pnpm verify與spectra analyze versioned-playback-profile-governance。
