## Why

`/settings/images` 已經不再是主圖庫，而是 playlist/runtime governance 與 editor handoff page；但目前它仍留下幾個明顯的不完整點，例如 disabled 的 focus/crop action、multi-playlist-entry 僅能編輯第一筆、display references 只以 raw status text 呈現。這讓頁面雖然方向正確，卻還不像真正完成的治理工作台。

## What Changes

- 對齊 `Image Management` 的 governance surface tokens，讓 handoff、asset health、selection governance、editor panel 讀成同一套 operations workspace。
- 補齊 multi-playlist-entry governance，讓操作者可以辨識並管理同素材對應的多筆 playlist/runtime rows，而不是只看到第一筆。
- 將 focus/crop action 從 disabled placeholder 補成可執行工作流，優先採用導向 editor workspace 的單一路徑，而不是再造第二套 asset authoring UI。
- 將 display references、delete blockers、playlist bootstrap 狀態改為結構化治理 surface，而不是零散的 status blocks。

## Capabilities

### New Capabilities

- `image-management-governance-surface`: 定義 image management 作為 playlist/runtime governance、asset reference triage、editor handoff surface 的完整互動契約。

### Modified Capabilities

(none)

## Impact

- Affected specs: image-management-governance-surface
- Affected code:
  - New:
    - apps/web/src/components/management/imageGovernanceReferenceList.tsx
    - apps/web/src/components/management/imageGovernanceReferenceList.test.tsx
  - Modified:
    - apps/web/src/pages/ImageManagement/index.tsx
    - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
    - apps/web/src/pages/ImageManagement/viewModel.ts
    - apps/web/src/pages/ImageManagement/imageManagement.css
    - apps/web/src/services/api.ts
    - apps/server/src/routes/images.ts
  - Removed:
    - (none)
