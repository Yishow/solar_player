## Why

目前 display pages 正在使用的背景圖、主舞台圖、Solar card icon 圖等，來源多半是前端 import 或 direct `src` seed，例如 `Overview/assets.ts`、`Solar/assets.ts`、`Images/assets.ts`。Asset Library 只管理上傳到 server 的 `image_assets`，所以 operator 在圖庫中看不到「現在畫面正在用的那張背景圖或 icon」，也無法從圖庫自由替換它。這造成「可替換為圖庫物件」被實作成可手填 asset id，而不是把現有素材納入圖庫並從圖庫替換。

## What Changes

- 建立 display seed asset manifest，列出現有播放頁使用的背景、主舞台、card icon、flow icon、thumbnail、ornament fallback assets。
- 在 server seed/startup 流程中 idempotently 將這些 seed assets 複製或登錄到 managed asset library，並設定 category、usageScope、title、description。
- 讓 Asset Library 能顯示這些內建 seed assets，並標示它們是目前頁面預設素材或內建素材。
- 保留現有上傳流程；新增 bootstrap 不得覆蓋 operator 已上傳或已替換的 managed assets。

## Capabilities

### New Capabilities

- `display-seed-asset-library-bootstrap`: 定義現有 display seed visual assets 必須進入 managed asset library，成為可看見、可引用、可替換的 catalog items。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-seed-asset-library-bootstrap
- Affected code:
  - New: apps/server/src/services/displaySeedAssetBootstrapService.ts, apps/server/src/services/displaySeedAssetManifest.ts
  - Modified: apps/server/src/db/seed.ts, apps/server/src/routes/imagesSupport.ts, apps/web/src/pages/AssetLibrary/index.tsx
  - Tests: apps/server/src/services/displaySeedAssetBootstrapService.test.ts, apps/server/src/routes/images.test.ts, apps/web/src/pages/AssetLibrary/index.test.tsx
