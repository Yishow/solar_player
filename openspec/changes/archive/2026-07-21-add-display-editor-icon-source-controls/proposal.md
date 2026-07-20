## Why

目前 5 個 display 頁的 icon 來源分散在 asset-backed image、`ReferenceGlyph`、page-local SVG registry 三種模型中，而且 editor 無法檢視或切換它們。這讓「同一設計語言」只能停留在位置與大小，無法把 icon identity 與 source contract 一起納入可維護的 editor 流程。

## What Changes

- 為 display editor 新增明確的 icon source control contract，讓符合條件的 KPI、info、status、node、load-row region 可切換 icon source mode。
- 支援至少三種 source mode：managed/static asset image、`ReferenceGlyph` key、page-local icon registry key，並保留各模式需要的 metadata 欄位。
- 讓 editor preview、draft config 與 playback runtime 使用同一個 icon resolver，避免 editor 能看見、runtime 卻無法套用。
- 補上 source validation 與 fallback semantics，當 source key 無效、asset 缺漏或 page-local key 不相容時，回退到該 region 的 seed baseline 並回報 editor issue。

## Non-Goals

- 不處理 hero/main-stage 等大圖媒體來源模式。
- 不處理 card typography、padding、surface tone 等 style token。
- 不建立 generic 任意 SVG 上傳/編輯系統；本 change 只處理既有 icon source 類型的切換與解析。
- 不改 region 幾何與 page-level layout。

## Capabilities

### New Capabilities

- `display-editor-icon-source-controls`: 讓 display editor 為 5 個 display 頁的符合條件 region 持久化 icon source mode 與 source metadata，並由 preview/runtime 共用解析流程。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-editor-icon-source-controls`
- Affected code:
  - Modified:
    - apps/web/src/components/ReferenceGlyph.tsx
    - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
    - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Solar/displayPageConfig.ts
    - apps/web/src/pages/Solar/index.tsx
    - apps/web/src/pages/Sustainability/displayPageConfig.ts
    - apps/web/src/pages/Sustainability/index.tsx
    - apps/web/src/pages/Images/displayPageConfig.ts
    - apps/web/src/pages/Images/index.tsx
    - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
    - apps/web/src/pages/FactoryCircuit/index.tsx
  - New:
    - apps/web/src/components/displayPageIconResolver.tsx
    - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - Removed: (none)
