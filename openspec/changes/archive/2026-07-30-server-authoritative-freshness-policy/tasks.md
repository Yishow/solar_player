## 1. Policy 與 evaluator TDD

- [x] 1.1 先為 Manage four global Freshness Policy categories、Return Server-authoritative freshness metadata、Preserve freshness semantics during temporary disconnection 寫failing table tests；驗證四類defaults、嚴格遞增、missing timestamp與exact boundaries。
- [x] 1.2 實作 Classify metrics into four policy buckets，使每個runtime datum有唯一category且static不因age降級；以shared registry completeness test驗證。
- [x] 1.3 實作 Evaluate freshness on the Server with source timestamps，使payload回category/state/sourceTimestamp/ageMs/nextTransitionAt；以injected App Time evaluator tests驗證。

## 2. Runtime 與呈現

- [x] 2.1 實作 Keep Site-scoped Readiness and Rotation consistent、Resolve per-metric freshness through the global category Policy、Readiness consumes the authoritative Freshness Policy result；以CL/KN readiness/rotation integration tests驗證無跨Site阻擋。
- [x] 2.2 實作 Continue offline aging only while App Time is trusted，使短斷線monotonic推進且time-untrusted ageFrozen；以Client state tests驗證。
- [x] 2.3 實作 Render provenance instead of pretending live、Present provenance for non-live data、Sustainability identifies delayed, stale, and historical values；以語意contract tests驗證source time、labels與no live animation/current wording。
- [x] 2.4 [P] 實作GET/PUT /api/freshness-policy管理能力，invalid mutation保留舊policy；以Fastify route tests驗證。

## 3. 整體與視覺驗證

- [x] 3.1 執行shared/server/web focused tests、pnpm test、pnpm build、pnpm verify與spectra analyze server-authoritative-freshness-policy。
- [x] 3.2 以pnpm run fhd:witness -- --base-url <url>產生五頁fresh screenshots、gap notes與evidence bundle；由使用者驗收non-live語意。
