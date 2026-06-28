## 1. 移除 region-builder 函式與其專屬 import

- [x] 1.1 [P] 從 `runtimeOverview.tsx` 移除 `buildOverviewRegions` 及其僅供該函式使用的 `runtimeFieldBuilders` / `DisplayEditorRegion` import，保留 `overviewRuntimePageDefinition`；驗證：`grep -n buildOverviewRegions apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx` 無輸出，`grep -rn overviewRuntimePageDefinition apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx` 仍命中。
- [x] 1.2 [P] 從 `runtimeSolar.tsx` 移除 `buildSolarRegions` 及其專屬 import，保留 `solarRuntimePageDefinition`；驗證：`grep -n buildSolarRegions` 該檔無輸出。
- [x] 1.3 [P] 從 `runtimeImages.tsx` 移除 `buildImagesRegions` 及其專屬 import，保留 `imagesRuntimePageDefinition`；驗證：`grep -n buildImagesRegions` 該檔無輸出。
- [x] 1.4 [P] 從 `runtimeFactoryCircuit.tsx` 移除 `buildFactoryCircuitRegions` 及其專屬 import，保留 `factoryCircuitRuntimePageDefinition`；驗證：`grep -n buildFactoryCircuitRegions` 該檔無輸出。
- [x] 1.5 [P] 從 `runtimeSustainability.tsx` 移除 `buildSustainabilityRegions` 及其專屬 import，保留 `sustainabilityRuntimePageDefinition`；驗證：`grep -n buildSustainabilityRegions` 該檔無輸出。

## 2. 移除無引用的型別與 builder 模組

- [x] 2.1 刪除 `apps/web/src/pages/DisplayPagesEditor/runtimeFieldBuilders.ts`（`textField` / `numberField` / `mediaPlacementFields` / `toContentTop` / `UpdatePath` 已無 production 引用）；驗證：`grep -rn runtimeFieldBuilders apps/web/src` 僅可能剩被改寫的測試，production 檔無 import。
- [x] 2.2 移除 `index.tsx` 中僅服務 region-builder 的 `DisplayEditorRegion` 與 `DisplayEditorField` 型別宣告及其 export；驗證：`grep -rn "DisplayEditorRegion\b" apps/web/src --include=*.tsx --include=*.ts`（排除 `ResolvedDisplayEditorRegion`）無 production 命中，`pnpm --filter @solar-display/web build` 型別檢查通過。

## 3. 同步治理測試與 ledger 文件（落實 Requirement: Ledger SHALL use current repo sources and avoid deprecated workflow inputs）

- [x] 3.1 從 `runtimePageDefinitions.test.tsx` 移除針對 `mediaPlacementFields` 的測試與其 import，保留 `*RuntimePageDefinition` 的 live 斷言；驗證：`pnpm --filter @solar-display/web test` 中該測試檔通過且不再 import `runtimeFieldBuilders`。
- [x] 3.2 從 `fhdEditorCapabilityGapLedger.test.ts` 移除要求 ledger 內含五個 `build*Regions` 字串的 `assert.match`，保留 `*DisplayPageEditorRegions` 與 live editor source 斷言；驗證：該測試檔通過。
- [x] 3.3 更新 `docs/fhd-editor-gap-ledger.md`，刪除引用已不存在 `build*Regions` 的描述，改述 `*DisplayPageEditorRegions` 為唯一 active editor-region 來源，以滿足 Requirement: Ledger SHALL use current repo sources and avoid deprecated workflow inputs；驗證：`grep -n "build.*Regions" docs/fhd-editor-gap-ledger.md` 無輸出，且 ledger 仍保有五頁 `*DisplayPageEditorRegions` 引用。

## 4. 全面驗證

- [x] 4.1 執行 `pnpm --filter @solar-display/web test` 與 `pnpm run build`，確認移除後無破壞、型別與所有 web 測試（含 `displaySurfaceVisualGuardrails.test.ts`、`fhdEditorCapabilityGapLedger.test.ts`、`runtimePageDefinitions.test.tsx`）通過。
