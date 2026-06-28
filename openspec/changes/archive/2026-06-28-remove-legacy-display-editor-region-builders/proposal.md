## Why

`/display-pages/editor` 的 region 解析早已改用 schema-driven 的 `*DisplayPageEditorRegions`（經由 `pageRegionSchemasByTemplate` 與 `resolveDisplayEditorRegions`）。每個 `runtime*.tsx` 內的 module-local `build*Regions` 函式不再被 editor 呼叫，整個 region-builder 子系統（含 `runtimeFieldBuilders.ts` 與 `DisplayEditorRegion` / `DisplayEditorField` 兩個型別）已成為無引用的 legacy 程式，但仍被 FHD editor gap ledger 文件與其測試以「反例見證」形式追蹤，增加閱讀與維護負擔。

## What Changes

- 移除五個無引用的 region-builder：`buildOverviewRegions`、`buildSolarRegions`、`buildFactoryCircuitRegions`、`buildImagesRegions`、`buildSustainabilityRegions`，保留各檔 live 的 `*RuntimePageDefinition`（`renderPage` / `renderPreview` / `createSeedConfig` / `templateKey` 仍被 playback route host、preview registry 與 editor runtime 使用）。
- 移除 `apps/web/src/pages/DisplayPagesEditor/runtimeFieldBuilders.ts`，以及僅服務 builder 的 `DisplayEditorRegion`、`DisplayEditorField` 型別與其在各 `runtime*.tsx` 的 import。
- 移除只測試 builder helper 的測試項目（`runtimePageDefinitions.test.tsx` 對 `mediaPlacementFields` 的測試），保留針對 `*RuntimePageDefinition` 的 live 斷言。
- 更新 `docs/fhd-editor-gap-ledger.md`：刪除引用已不存在 `build*Regions` 的描述段落，改以 `*DisplayPageEditorRegions` 為唯一權威 editor-region 來源敘述。
- 更新 `fhdEditorCapabilityGapLedger.test.ts`：移除要求 ledger 內含 `build*Regions` 字串的斷言，使治理測試與移除後的事實一致。

## Non-Goals

- 不更動 schema-driven editor region 的任何行為、欄位或 inspector 呈現。
- 不更動 `*RuntimePageDefinition` 物件本身或 playback / preview / editor runtime 的執行路徑。
- 不新增任何 editor 能力，也不調整 Overview KPI footer 既有的 `footerType` / `footerText` / `targetValue` 控制。
- 不重寫 ledger 的整體結構、分類欄位或其餘 requirement，只移除與已刪程式相依的引用。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `fhd-editor-capability-gap-ledger`: ledger 與其治理測試不再以 `build*Regions` 作為「unused helper 反例見證」；改為僅以 `*DisplayPageEditorRegions` 作為 active editor-region 權威來源來陳述。

## Impact

- Affected specs: `fhd-editor-capability-gap-ledger`
- Affected code:
  - Modified:
    - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
    - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
    - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
    - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
    - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
    - apps/web/src/pages/DisplayPagesEditor/index.tsx
    - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
    - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
    - docs/fhd-editor-gap-ledger.md
  - Removed:
    - apps/web/src/pages/DisplayPagesEditor/runtimeFieldBuilders.ts
