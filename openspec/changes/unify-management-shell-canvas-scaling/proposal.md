## Why

目前播放頁與管理頁雖然共用 AppHeader，但兩者不在同一種縮放模型內：播放頁把 header、content、footer 一起放進 1920x1080 畫布再整體縮放，管理頁則只有內容框縮放、header/footer 留在未縮放的外層 shell。結果是同一個 viewport 下管理頁 header 會穩定看起來比播放頁更大，造成整站 shell 比例不一致。

這個差異已經被確認是殼層結構問題，不是單純字級設定問題，因此需要用 spec-driven 方式把管理頁 shell 模型統一，避免未來再以 route 特例或局部 CSS 微調回到同樣的漂移。

## What Changes

- 將全部 management routes 切換到單一的 whole-page canvas shell，讓 header、content、footer 一起進入固定基準畫布並共用同一個縮放模型。
- 讓管理 shell 直接複用與播放頁一致的 canvas layout 計算邏輯，明確定義 1920x1080 畫布與 header/content/footer slot 尺寸。
- 保留 hideChrome 行為，但改成在同一張 management canvas 內切換 chrome 顯示，而不是退回舊的未縮放 shell。
- 移除 routeMeta 中只讓部分管理頁進入 fixed-fhd 內容框的 managementFrame 分流，改成所有 management routes 共用同一個 shell contract。
- 補上結構測試與瀏覽器回歸驗證，確保管理頁與播放頁在相同 viewport 下維持一致的 header 感知比例。

## Non-Goals

- 不重做 playback shell 的視覺設計。
- 不為小螢幕另外新增第二套管理頁專用版面。
- 不大規模改寫各管理 route 的內容 UI，只處理 shell 模型與其直接衍生的驗證更新。

## Capabilities

### New Capabilities

- `management-shell-canvas-scaling`: 定義所有 management routes 使用與播放頁對齊的 whole-page canvas shell、共享縮放規則與一致的 shell primitive。

### Modified Capabilities

(none)

## Impact

- Affected specs: management-shell-canvas-scaling
- Affected code:
  - New: None
  - Modified: apps/web/src/layouts/ManagementShell.tsx, apps/web/src/components/ManagementFixedLayoutFrame.tsx, apps/web/src/app/routeMeta.ts, apps/web/src/components/shellFoundation.test.ts, apps/web/src/components/AppHeader.tsx, apps/web/src/components/AppFooterNav.tsx
  - Removed: None
