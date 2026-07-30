## Why

現有 Story、Readiness 與 Rotation 仍從全域播放狀態推導廠區，無法保證兩台使用相同 Profile 的 CL／KN Client 得到隔離結果。Server 必須由可信 Device Credential 建立 Display Client Context，並在單一權威位置完成 Site Scope 決策。

## What Changes

- 由有效 Credential、啟用 Device、唯一 Group 與 Profile 建立 Display Client Context。
- 未配對、停用、撤銷或缺少有效 Group 的 Client 回傳明確狀態，不回退到任一廠區。
- 所有廠區相關 Story、Aggregate、Readiness、Freshness 與 Effective Rotation 只接受可信 Context，不接受 query、header 或前端 state 自行宣稱 site。
- CL／KN Client 共用同一 Profile 的通用頁面，但 Factory Circuit、Sustainability、Overview 與 Solar 使用各自 Site Scope。
- 以 Profile identity/version 與 Site Scope 重用 Effective Rotation snapshot，避免 50 台 Client 重複完整計算。
- Site 變更在 Safe Playback Boundary 套用；當前頁失效時於最近可控邊界切到 Profile 起始頁或第一個有效頁。

## Capabilities

### New Capabilities

- device-context-site-scoped-playback: 定義可信 Display Client Context、site data isolation、Effective Rotation cache 與安全切換。

### Modified Capabilities

- factory-circuit-multi-site-split: Factory Circuit scope 改由 Display Client Context 決定。
- sustainability-factory-scope-by-playback-settings: Sustainability scope 不再由全域 page enablement 推導。
- display-page-rotation-plan: Rotation evaluation 加入 Profile 與 Site Scope 的 Server-side context。
- page-scoped-display-story-runtime: Story request 以可信 Device Context 決定廠區資料。
- display-readiness-checks: Readiness 只評估 Client Site Scope 相關來源。

## Impact

- Affected specs: device-context-site-scoped-playback, factory-circuit-multi-site-split, sustainability-factory-scope-by-playback-settings, display-page-rotation-plan, page-scoped-display-story-runtime, display-readiness-checks
- Affected code:
  - New: apps/server/src/services/displayClientContextService.ts, apps/server/src/plugins/deviceContext.ts, apps/server/src/services/effectiveRotationCache.ts, apps/server/src/routes/device-context-playback.test.ts, packages/shared/src/displayClientContext.ts, apps/web/src/hooks/useDisplayClientContext.ts
  - Modified: apps/server/src/app.ts, apps/server/src/routes/display-story.ts, apps/server/src/routes/display-readiness.ts, apps/server/src/routes/playback.ts, apps/server/src/services/displayStoryService.ts, apps/server/src/services/displayReadinessService.ts, apps/server/src/services/displayRotationService.ts, apps/server/src/services/sustainabilityStoryService.ts, packages/shared/src/displayRotation.ts, packages/shared/src/index.ts, apps/web/src/hooks/usePlaybackController.ts
  - Removed: none
