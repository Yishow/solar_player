## Why

全站 audit 已確認目前 14 條 route 雖然都有對應 reference page，但共同卡在同一個上游問題：`LayoutShell` 仍是 flex-based app shell，`PageScaffold` 仍把頁面拉成 dashboard title block + stacked content，導致後續任何 route-specific 對位都會建立在錯的骨架上。若不先把 shared shell host 與 playback shell boundary 修正，後續逐頁對齊只會繼續把 reference page dashboard 化。

## What Changes

- 只修正 shared shell host：讓 web app 以 reference-style 的 `1920x1080` internal canvas 與 viewport scaling 承載 route content，而不是 `max-width` container + scrollable main。
- 只修正 shell boundary：把 playback pages 從 `PageScaffold` 的 management-style title/description layout 中拆開，建立 playback-only shell primitive 或 title-group contract。
- 保留 management pages 可繼續使用 `PageScaffold` / `PageContainer` 家族，但縮小它們的責任，使其不再被視為全站預設畫布模型。
- 用一條 playback witness route 與一條 management witness route 驗證 shared shell host 與 shell split 生效，不在本 change 內承諾完成頁面本體的 reference composition。

## Non-Goals

- 不處理 14 頁逐頁 reference alignment。
- 不在本 change 內完成 `/solar`、`/overview` 或其他任一頁的 full absolute-position page composition。
- 不改 backend、socket、MQTT、route contract、page-specific data mapping。
- 不把 page-specific image/icon asset binding 一起塞進這個 change。

## Capabilities

### New Capabilities

- `fhd-canvas-host-and-playback-shell`: 定義 shared `1920x1080` canvas host、viewport scaling、header/footer shell geometry，以及 playback shell 與 management scaffold 的責任分界。

### Modified Capabilities

(none)

## Impact

- Affected specs: `fhd-canvas-host-and-playback-shell`
- Affected code:
  - Modified:
    - `apps/web/src/layouts/LayoutShell.tsx`
    - `apps/web/src/components/AppHeader.tsx`
    - `apps/web/src/components/AppFooterNav.tsx`
    - `apps/web/src/pages/shared/PageScaffold.tsx`
    - `apps/web/src/components/PageContainer.tsx`
    - `apps/web/src/components/TitleBlock.tsx`
    - `apps/web/src/styles/global.css`
    - `apps/web/src/styles/tokens.css`
  - New:
    - `apps/web/src/components/DisplayCanvas.tsx`
    - `apps/web/src/components/PlaybackTitleGroup.tsx`
    - `openspec/changes/repair-fhd-canvas-host-and-playback-shell/specs/`
  - Removed:
    - (none)
