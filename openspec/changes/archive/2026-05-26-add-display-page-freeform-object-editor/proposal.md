## Why

page freeform object runtime 建好後，如果 editor 仍只能操作 seed-backed regions，operator 依然無法實際新增、選取或調整自由物件，page object layer 就只是不可編輯的資料容器。使用者目前最直接的痛點就是物件被蓋住、不好選、無法切上下層，因此 page authoring 需要正式的 object list 與 layer-aware 編輯能力。

## What Changes

- 在 Display Pages Editor 中新增 page freeform object authoring，讓 operator 可新增、選取、刪除 line、asset-image、icon-asset 物件。
- 新增 page object list，支援直接選取、前後層排序、鎖定、顯隱、複製與依型別顯示摘要。
- 新增 asset-library-backed picker，讓 asset-image 與 icon-asset 物件可直接從分類資產庫挑來源，而不是輸入 raw id。
- 讓 canvas、inspector 與 draft save flow 可處理自由物件，不再只認 seed-backed regions。
- 保持既有 page regions、card rails 與 freeform objects 共存在同一頁編輯工作流中，但維持清楚的 object layer 邊界。

## Capabilities

### New Capabilities

- `display-page-freeform-object-authoring`: 提供 display pages 自由物件的新增、選取、排序與儲存編輯能力。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-page-freeform-object-authoring
- Affected code:
  - New: apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx, apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - Modified: apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts, apps/web/src/pages/DisplayPagesEditor/index.tsx, apps/web/src/pages/DisplayPagesEditor/regionTree.tsx, apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx, apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - Removed: none
