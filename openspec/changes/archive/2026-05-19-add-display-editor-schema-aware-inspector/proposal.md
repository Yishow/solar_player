## Why

目前 inspector 幾乎只支援簡單 text/number 欄位，對陣列、枚舉、素材引用、驗證限制與欄位依賴都缺乏結構化編輯能力。隨著五頁 config 變得更豐富，如果 inspector 仍維持硬寫欄位清單，後續每加一個能力都會增加大量重複 UI 與維護風險。

## What Changes

- 建立 schema-aware inspector，讓 editor 可依欄位型別自動渲染 text、number、toggle、select、array item、asset reference 與 status-only 欄位。
- 為 inspector 補上欄位限制、即時驗證、單欄位 reset、單 region reset 與 seed/live 差異標記，使內容調整能在同一處完成而不必回頭查 seed。
- 支援 region-level preset、內容範本與欄位群組，讓多個頁面的重複內容結構能以可重用方式維護。
- 將 editor runtime 的 region 定義改成宣告式 schema，而不是每頁手動拼接輸入欄位，降低新增頁面能力時的重工。

## Capabilities

### New Capabilities

- `display-editor-typed-inspector-controls`: 提供依欄位 schema 自動渲染的 typed inspector controls 與欄位約束能力。
- `display-editor-reset-and-diff-tools`: 提供欄位級、region 級 reset 與 seed/live 差異提示能力。
- `display-editor-region-presets`: 提供 region preset、欄位群組與內容範本能力。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-editor-typed-inspector-controls`, `display-editor-reset-and-diff-tools`, `display-editor-region-presets`
- Affected code:
  - Modified: `apps/web/src/pages/DisplayPagesEditor/index.tsx`, `apps/web/src/pages/DisplayPagesEditor/runtime.tsx`, `apps/web/src/pages/Overview/displayPageConfig.ts`, `apps/web/src/pages/Solar/displayPageConfig.ts`, `apps/web/src/pages/FactoryCircuit/displayPageConfig.ts`, `apps/web/src/pages/Images/displayPageConfig.ts`, `apps/web/src/pages/Sustainability/displayPageConfig.ts`
  - New: `packages/shared/src/displayEditorSchema.ts`, `apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx`, `apps/web/src/pages/DisplayPagesEditor/presets.ts`
  - Removed: none
