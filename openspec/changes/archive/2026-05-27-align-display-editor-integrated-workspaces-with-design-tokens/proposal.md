## Why

目前 `/display-pages/editor` 已經承接 page authoring、整合後的資產庫 workspace、shared shell workspace，以及 canonical media-effect authoring/summary surfaces。`/settings/assets` 與 `/shell-decorations/editor` 也已經是回到 editor workspace 的相容入口，而不是獨立主頁。現況問題不是 workflow 還沒接上，而是這些 surfaces 視覺上仍混用 hardcoded card、`--shell-*` 顏色與 page-local style，實用區塊密度也不一致。

## What Changes

- 讓 `/display-pages/editor`、integrated asset workspace、integrated shell workspace、右側 editor panels 與上方 context/action 區塊對齊既有 semantic design tokens。
- 收斂 hardcoded colors、陰影、圓角與拼裝 card，改用共享 editor/workspace primitives 與 token roles。
- 補齊整合 workspace 的實用內容，包括 context summary、selected item detail、return/apply actions、draft status、replace/restore entry、empty state 與 blocked-state 說明。
- 保留目前已完成的工作流契約：套用目前素材並返回、返回頁面編輯、source connection 跳轉、shell draft context preservation、以及 `屬性` / `來源連接` 對 media effects 的單一職責邊界。
- 維持 `/settings/assets`、`/shell-decorations/editor` 作為相容入口與 handoff route，而不是把它們重新拉回主要 footer 導覽。

## Capabilities

### New Capabilities

- `display-editor-integrated-workspace-design-token-alignment`: 定義 display editor 與其整合 workspace 的 semantic token 使用、shared surface primitives 與 practical action density contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-editor-integrated-workspace-design-token-alignment`
- Affected code:
  - Modified:
    - `apps/web/src/pages/DisplayPagesEditor/index.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx`
    - `apps/web/src/pages/AssetLibrary/index.tsx`
    - `apps/web/src/pages/ShellDecorationEditor/index.tsx`
    - `apps/web/src/pages/ShellDecorationEditor/objectList.tsx`
    - `apps/web/src/components/AppFooterNav.tsx`
    - `apps/web/src/styles/tokens.css`
    - `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`
    - `apps/web/src/pages/AssetLibrary/index.test.tsx`
    - `apps/web/src/pages/ShellDecorationEditor/index.test.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx`
  - New:
    - `apps/web/src/pages/DisplayPagesEditor/editorWorkspaceSurface.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/editorWorkspaceSurface.css`
    - `openspec/changes/align-display-editor-integrated-workspaces-with-design-tokens/specs/display-editor-integrated-workspace-design-token-alignment/spec.md`
  - Removed:
    - (none)
