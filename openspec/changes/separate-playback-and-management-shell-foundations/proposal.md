## Summary

將 playback shell 與 management shell 正式拆開，讓固定 1920x1080 的 `DisplayCanvas` 只服務播放頁，而管理頁使用真正的 admin shell，而不是縮在同一個 FHD 縮放容器裡。

## Motivation

目前 `LayoutShell` 與 `ManagementShell` 都包在 `DisplayCanvas` 內。這讓 display editor、settings 與 status surfaces 在管理模式下仍被當成播放畫布內容縮放，容易產生「頁面縮在容器裡，不是滿版」等殼層問題，也使 admin surface 與 playback geometry 綁得過緊。

## Proposed Solution

- 讓 `DisplayCanvas` 成為 playback-only shell primitive。
- 建立獨立的 management shell，提供 full-bleed scrolling、responsive admin layout 與不受 FHD scale 影響的容器。
- route group 直接決定 shell 類型，避免 management pages 共享 playback scaling assumptions。
- 保留共用 header/nav 品牌元素，但容器與尺寸策略分流。

## Non-Goals

- 不在這個 change 重做每個 management page 的內容。
- 不處理 security/auth。
- 不更動 display page FHD reference 對齊幾何。

## Impact

- Affected specs: `display-shell-surface-separation`
- Affected code:
  - Modified: `apps/web/src/layouts/LayoutShell.tsx`
  - Modified: `apps/web/src/layouts/ManagementShell.tsx`
  - Modified: `apps/web/src/components/DisplayCanvas.tsx`
  - Modified: `apps/web/src/components/PageContainer.tsx`
  - Modified: `apps/web/src/app/router.tsx`
  - Modified: `apps/web/src/app/routeMeta.ts`
  - Modified: `apps/web/src/styles/management.css`
  - Modified: `apps/web/src/styles/global.css`
