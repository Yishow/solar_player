## Why

目前 display page editor 已能直接修改五個展示頁的版位與部分文案，但所有變更一儲存就直接成為正式播放內容，缺少草稿、預覽、發布、回滾與安全檢查。這使維運人員很難在現場螢幕不中斷的前提下調整內容，也無法對錯誤配置建立可靠的復原流程。

## What Changes

- 為 display page config 建立 draft/live 雙軌發布模型，讓編輯器可在不影響正式播放的前提下保存草稿、預覽差異並手動發布。
- 補上發布歷程、版本號、發布者與回滾能力，讓五頁配置可以回退到先前的可用版本，而不是只能覆寫目前狀態。
- 在發布前加入版位安全檢查，至少涵蓋畫布越界、關鍵區塊重疊、必要欄位缺漏與不合法數值，避免錯誤配置進入正式輪播。
- 為各展示頁定義可配置的 fallback policy，讓資料中斷、素材不存在或配置不完整時，正式頁面仍有一致的降級策略與顯示訊息。
- 在管理端 editor 顯示 draft/live 差異、驗證結果與發布狀態，讓維運人員可清楚知道目前正在編輯的是草稿還是正式版本。

## Capabilities

### New Capabilities

- `display-page-draft-live-publishing`: 提供 display page 草稿保存、正式發布、版本追蹤與回滾能力。
- `display-page-layout-safety-guards`: 在發布與預覽前驗證版位幾何、必要欄位與配置合法性，阻止危險配置進入正式播放。
- `display-page-fallback-policies`: 為展示頁配置定義資料中斷、素材缺失與空內容時的正式降級規則。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-page-draft-live-publishing`, `display-page-layout-safety-guards`, `display-page-fallback-policies`
- Affected code:
  - Modified: `apps/web/src/pages/DisplayPagesEditor/index.tsx`, `apps/web/src/pages/DisplayPagesEditor/runtime.tsx`, `apps/web/src/hooks/useDisplayPageConfig.ts`, `apps/web/src/services/api.ts`, `apps/server/src/routes/display-pages.ts`, `packages/shared/src/displayPageConfig.ts`
  - New: `apps/server/src/db/migrations`, `apps/server/src/services/displayPagePublishingService.ts`, `apps/web/src/pages/DisplayPagesEditor/publishing.ts`, `apps/web/src/pages/DisplayPagesEditor/validation.ts`
  - Removed: none
