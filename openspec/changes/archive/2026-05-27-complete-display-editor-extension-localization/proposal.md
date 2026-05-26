## Why

Display Pages Editor 主體已逐步中文化，但近期新增的 extension surfaces 仍有中英混雜：media effect fields 使用 `Edge Fade`、`Blur`、`Opacity`，Shell Decorations inspector 使用 `Header`、`Footer`、`Line`、`Asset Image`、`Z Index`、`Ornament` 等英文。這讓功能看起來未完成，也會放大「做完但只是工程接上」的感覺。

## What Changes

- 補齊 display editor 相關新增 surface 的繁體中文 labels、actions、status、empty states。
- 覆蓋 media effect controls、page freeform object controls、asset picker、Shared Shell Decorations controls。
- 保留必要英文作為次要 subtitle 或技術鍵值，不讓主要操作文案中英混雜。
- 增加測試或靜態 coverage，避免新增 editor fields 再漏中文化。

## Capabilities

### New Capabilities

- `display-editor-extension-localization`: 定義 display editor extension UI 必須使用一致的繁體中文操作文案。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-editor-extension-localization
- Affected code:
  - Modified: apps/web/src/pages/DisplayPagesEditor/localization.ts, apps/web/src/pages/shared/displayPageMediaEffectConfig.ts, apps/web/src/pages/ShellDecorationEditor/index.tsx, apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - Tests: apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx, apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx, apps/web/src/pages/ShellDecorationEditor/index.test.tsx
