## Summary

把 display readiness、rotation gating、fallback policy 與 offline routing 收斂成單一 page-eligibility contract，避免 live-dependent 頁面在缺資料時長期以 mock/fallback 假裝健康播放。

## Motivation

目前 `displayReadinessService` 能產生 blocking findings，但 `displayRotationService.buildPageConditions()` 沒有消費這些 findings，只看 metrics freshness 與 asset health。前端 `shouldRedirectToOffline()` 又只在 `hasPlayablePages` 為零時才切 `/offline`，而且所有 playback route 都設成 `allowOfflineWhenDisconnected: true`。結果是資料斷線時頁面多半繼續顯示 fallback/mock，而不是進入明確 fault mode。

## Proposed Solution

- 以 readiness、asset health、metrics freshness、published stage 與 page fallback policy 組合出統一的 page eligibility 評估。
- 讓 rotation preview 與 effective rotation 顯示 blocking reason hierarchy。
- 定義何時允許 demo/mock fallback、何時必須 skip 頁面、何時整體進 offline/fault page。
- 補齊 diagnostics 與 targeted tests，驗證 page eligibility 的可追蹤性。

## Non-Goals

- 不在這個 change 重做頁面 shell 或 editor。
- 不新增全新的 monitoring page family。

## Impact

- Affected specs: `display-readiness-checks`, `display-page-rotation-plan`, `display-page-fallback-policies`, `display-page-skip-reason-reporting`
- Affected code:
  - Modified: `apps/server/src/services/displayReadinessService.ts`
  - Modified: `apps/server/src/services/displayRotationService.ts`
  - Modified: `apps/server/src/services/displayOpsService.ts`
  - Modified: `apps/web/src/layouts/offlineRouting.ts`
  - Modified: `apps/web/src/layouts/LayoutShell.tsx`
  - Modified: `apps/web/src/hooks/usePageRotation.ts`
  - Modified: `packages/shared/src/displayReadiness.ts`
  - Modified: `packages/shared/src/displayRotation.ts`
  - Modified: `apps/server/src/routes/display-readiness.ts`
  - Modified: `apps/server/src/routes/playback.ts`
