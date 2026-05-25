## Why

即使 shared shell decoration schema 已存在，header/footer 目前仍只會渲染固定 shell markup 與既有 CSS，無法真正把線條或裝飾素材當成全站共用 shell objects 顯示出來。若 runtime render 不先落地，後續 editor 與資產管理頁即使能存資料，也無法驗證它們是否真的在 playback 與 management shells 生效。

## What Changes

- 新增 shared shell decoration runtime loader，讓 playback 與 management shells 都從同一個 public-safe live contract 讀取 header/footer objects。
- 在 header 與 footer band 中新增 decoration layers，支援 line、asset-image、ornament-image 三種 shell objects 的 deterministic render。
- 保留既有品牌、時間、狀態、導航等 shell chrome，並明確定義 shell objects 與互動元素的 layer 與 pointer-events 邊界。
- 新增 runtime fallback 與缺資產處理，確保沒有 live config 或 asset 失效時，shell 仍維持可用與可讀。

## Capabilities

### New Capabilities

- `shared-shell-decoration-rendering`: 在 playback 與 management shells 中渲染全站共用的 header/footer decoration objects。

### Modified Capabilities

(none)

## Impact

- Affected specs: shared-shell-decoration-rendering
- Affected code:
  - New: apps/web/src/components/ShellDecorationLayer.tsx, apps/web/src/hooks/useShellDecorations.ts, apps/web/src/components/ShellDecorationLayer.test.tsx, apps/web/src/hooks/useShellDecorations.test.ts
  - Modified: apps/web/src/components/AppHeader.tsx, apps/web/src/components/AppFooterNav.tsx, apps/web/src/components/DisplayCanvas.tsx, apps/web/src/layouts/LayoutShell.tsx, apps/web/src/layouts/ManagementShell.tsx, apps/web/src/services/shellDecorations.ts
  - Removed: none
