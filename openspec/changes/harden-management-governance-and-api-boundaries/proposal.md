## Problem

管理面目前幾乎所有 mutation API 都在 permissive CORS 下直接暴露，沒有 auth/authz boundary；`BrandAssets` 也尚未接入 shared remote-sync draft guard。這讓系統在 production 環境下同時存在操作治理不一致與 API 邊界過寬的問題。

## Root Cause

專案先把 local single-operator workflow 做通，導致 mutation pages 與 API routes 主要仰賴前端按鈕、`window.confirm` 與網路可達性，而不是正式的 access boundary 與 shared governance contract。

## Proposed Solution

- 建立 management mutation access boundary，至少覆蓋 HTTP mutation routes、敏感 websocket-triggered actions 與跨來源請求。
- 收斂 CORS 與管理端認證設定，不再預設 `origin: true` 全開。
- 將 `BrandAssets` 等尚未接入的頁面納入 shared draft/remote-sync governance。
- 為破壞性操作加入最小化 audit trail 與 operator-facing state handling。

## Non-Goals

- 不做完整多角色 RBAC。
- 不重構所有 management UI 樣式。
- 不在這個 change 直接改動播放頁資料模型。

## Success Criteria

- 所有 mutation APIs 都有一致的 access boundary。
- 管理頁 dirty-state 與 remote-sync governance 規則一致，不再只靠 `window.confirm`。
- CORS 與 auth 配置能區分 trusted management origin 與其他來源。

## Impact

- Affected code:
  - Modified: `apps/server/src/app.ts`
  - Modified: `apps/server/src/routes/*.ts`
  - Modified: `apps/web/src/pages/BrandAssets/index.tsx`
  - Modified: `apps/web/src/hooks/displaySyncDraftGuard.ts`
  - Modified: `apps/web/src/services/api.ts`
  - Modified: `apps/server/src/config.ts`
  - Modified: `.env.example`
  - New: `packages/shared/src/managementAuth.ts`
  - New: `apps/server/src/plugins/managementAuth.ts`
