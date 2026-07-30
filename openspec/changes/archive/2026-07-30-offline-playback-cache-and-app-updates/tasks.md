## 1. Snapshot 與 asset cache TDD

- [x] 1.1 先為 Persist structured last-known playback snapshots、Cache the App Shell and published assets by content identity、Recover playback after Server loss and Browser restart 寫failingstore/cache tests；驗證atomic failure、hash mismatch、complete/incomplete cache。
- [x] 1.2 實作 Split structured state and immutable assets，使IndexedDB不存secret、Cache Storage依release/version/hash隔離；以schema與cache manifest tests驗證。
- [x] 1.3 實作 Commit snapshots atomically after successful validation，使部分candidate不取代last-known-good；以quota/corruption/transaction rollback tests驗證。

## 2. Service Worker 與 recovery

- [x] 2.1 實作 Let the Service Worker stage but not activate playback updates 與 Activate staged App updates at a Safe Playback Boundary，禁止自動skipWaiting/立即reload；以useSafeAppUpdate tests驗證。
- [x] 2.2 實作 Recover conservatively without trusted time 與 Recover an offline restart from the last-known-good App Shell，使relative rotation持續且absolute logic凍結；以offline hydration tests驗證。
- [x] 2.3 實作 Use only verified cached Images assets during offline playback，使missing/corrupt slide依既有fallback且其餘slides續播；以Images offline contract tests驗證。
- [x] 2.4 實作 Reconcile time and desired version after reconnect，使先同步time/desired再於safe boundary更新；以reconnect state-machine tests驗證。

## 3. Browser 與 FHD 驗收

- [x] 3.1 建立真實Browser test，warm cache後停止Server並重啟Browser，驗證shell/typography styles/images/rotation/metrics、source timestamps與time freeze；以tests/offline-playback-browser.test.mjs輸出驗證。
- [x] 3.2 執行unit/browser tests、pnpm test、pnpm build、pnpm verify與spectra analyze offline-playback-cache-and-app-updates。
- [x] 3.3 以pnpm run fhd:witness -- --base-url <url>產生五頁online/offline fresh screenshots、gap notes與evidence bundle；由使用者驗收offline與App update切換。
