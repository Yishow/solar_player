## Tasks

- [x] Implement `Align integrated display editor workspaces to semantic design tokens` by `Use semantic token roles instead of route-local styling` across page authoring, asset workspace, shell workspace, and right-side rails.
- [x] Implement `Introduce shared workspace surface primitives` for context boards, selection detail boards, sticky actions, empty states, and blocked states.
- [x] Implement `Integrated workspaces provide actionable context instead of placeholder chrome` by `Require practical action density inside integrated workspaces` for context, selected item detail, return/apply actions, and blocked explanations.
- [x] Implement `Preserve workflow contracts while aligning the surfaces` so apply-and-return, return-to-editor, source-connection jumps, and shell draft preservation remain intact.
- [x] Preserve the current `屬性` / `來源連接` responsibility split for media effects while aligning the right-side editor surfaces to shared tokens.
- [x] Implement `Keep compatibility entry routes as editor handoffs rather than standalone destinations` by `Keep compatibility entry routes as handoffs, not restored standalone navigation` for `/settings/assets` and `/shell-decorations/editor`.
- [x] Remove primary hardcoded visual styling from the affected editor/workspace surfaces in favor of semantic tokens or new editor-specific token roles.
- [x] Add route and component tests covering context banners, action visibility, apply/return state, and empty/blocked states.
- [x] Run affected web tests for DisplayPagesEditor, AssetLibrary, ShellDecorationEditor, and shell navigation.
