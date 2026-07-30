## 1. Desired／Applied TDD

- [x] 1.1 先為 Assign a Desired Version to target Groups、Apply Profile Versions at a Safe Playback Boundary、Report desired, applied, and update state per Device 寫failing server/client tests；驗證online/offline、validation fail與Group move。
- [x] 1.2 實作 Persist desired assignment per group and applied state per device，使Publish只更新desired且保留Device applied；以migration/service transaction tests驗證。
- [x] 1.3 實作 Stage version snapshots before the safe boundary，使candidate驗證後waiting、成功applied、失敗保留舊版；以profileRollout.test.ts controlled clock驗證。

## 2. Heartbeat 與管理彙總

- [x] 2.1 實作 Carry Profile rollout state in Device heartbeats，使Server比對desired且保留offline last applied；以Socket/heartbeat contract tests驗證。
- [x] 2.2 實作 Derive fleet summaries from device states 與 Derive fleet rollout summaries，使applied/waiting/offline/failed即時計算不保存漂移counter；以50-device viewModel tests驗證。
- [x] 2.3 實作 Profile version sync uses a Safe Playback Boundary，使sync不立即reload且current page valid/invalid皆有bounded transition；以playback sync tests驗證。

## 3. 整體與視覺驗證

- [x] 3.1 執行focused server/shared/web tests、50-client harness、pnpm test、pnpm build、pnpm verify與spectra analyze device-profile-rollout-observability。
- [x] 3.2 以pnpm run fhd:witness -- --base-url <url>產生五頁fresh screenshots、gap notes與evidence bundle；由使用者驗收rollout切換。
