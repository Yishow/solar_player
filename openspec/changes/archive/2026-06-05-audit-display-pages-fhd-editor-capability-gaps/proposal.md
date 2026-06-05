## Why

五個 playback 頁已經有相當多 `/display-pages/editor` 能力，但仍缺一份逐頁、逐 surface、逐欄位的現況缺口盤點。若直接開始強化 editor，容易重複補已存在的 schema，或把 FHD 差距誤判成 page-local CSS 修補。

## What Changes

- 新增一個 FHD editor capability gap ledger 工作流，先盤點 `Overview`、`Solar`、`FactoryCircuit`、`Images`、`Sustainability` 的現有 editor coverage，再決定四個已 park FHD change 要補哪些缺口。
- 產出 `docs/fhd-editor-gap-ledger.md`，以頁面、FHD reference、runtime surface、現有 editor region、現有 field group、缺口分類、下游 change、證據檔案為欄位。
- 盤點時以現行程式為準：`DisplayPagesEditor` 實際使用 `pageRegionSchemasByTemplate` 與各頁 `*DisplayPageEditorRegions`，不是 prototype HTML，也不是未接線的 helper function。
- 每個缺口必須分類為 `existing-editor-control`、`new-editor-capability`、`non-editor-runtime-gap`、`accepted-difference` 之一，並綁定到 `add-display-editor-fhd-typography-rhythm-controls`、`add-display-editor-fhd-ornament-media-controls`、`add-display-editor-fhd-flow-connector-controls`、`add-ai-led-fhd-witness-tooling`，或標成另開 change。
- 加入驗證規則：ledger 不可依賴 `docs/reference-match/`，不可把 page-local CSS-only 當作 editor capability gap 的最終解法。

## Non-Goals

- 不實作新的 editor controls。
- 不做五頁最終 FHD 視覺調整。
- 不新增 Playwright 截圖比對 tooling；截圖 tooling 由 `add-ai-led-fhd-witness-tooling` 負責。
- 不回到 `docs/reference/kuozui-green-fhd-html-prototype/` 或 `docs/reference-match/` 作為工作入口。

## Capabilities

### New Capabilities

- `fhd-editor-capability-gap-ledger`: 定義 FHD editor capability ledger 的輸出格式、現況盤點來源、缺口分類與下游 change 對應規則。

### Modified Capabilities

(none)

## Impact

- Affected specs: fhd-editor-capability-gap-ledger
- Affected code:
  - New:
    - docs/fhd-editor-gap-ledger.md
    - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - Modified: (none)
  - Removed: (none)
