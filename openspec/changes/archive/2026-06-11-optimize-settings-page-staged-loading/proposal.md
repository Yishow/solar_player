## Why

管理設定頁在樹莓派上每次進入都慢，主因不是單一 CSS 動畫，而是頁面掛載後同時啟動多組資料讀取與重型 preview 計算。Playback Settings、Image Management、MQTT Settings、Circuit Settings 都把首屏可互動表單、診斷資料、preview/runtime 狀態、polling 或 readiness refresh 綁在同一段載入流程。

## What Changes

- 新增 settings page staged loading 契約，要求四個設定頁將首屏必要資料與可延後資料分開載入。
- Playback Settings 收斂 loadPlaybackConfig、usePlaybackController、useDisplayOpsSummary、useLiveDisplayPagePreviewCatalog 的重複資料讀取，避免進頁時同時抓 settings、rotation preview、display ops、所有 live preview config。
- Image Management 合併 syncImages 與 bootstrap 中重複的 getImages、getImageStorageUsage、fetchImagePlaylistGovernance 流程，並把 asset health、asset references refresh 保持為背景診斷資料。
- MQTT Settings 將 broker/topic/weather 基礎設定載入、topic polling、weather options、weather preview 分段，避免進頁時所有 API 與 5 秒 polling 同時壓在首屏。
- Circuit Settings 將 circuits CRUD 基礎列表與 readiness 診斷分段，保留 draft guard 與 save/delete 行為。
- 保留既有 management/settings render invariance、dirty guard、save/test/CRUD behavior、MQTT password masking 與 display sync scoping。

## Capabilities

### New Capabilities

- `settings-page-staged-loading`: settings pages SHALL separate first-screen editable state from deferred diagnostics, previews, polling, and readiness refreshes while preserving existing operator behavior.

### Modified Capabilities

(none)

## Impact

- Affected specs: settings-page-staged-loading
- Affected code:
  - Modified: apps/web/src/pages/PlaybackSettings/index.tsx
  - Modified: apps/web/src/pages/PlaybackSettings/viewModel.ts
  - Modified: apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - Modified: apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - Modified: apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - Modified: apps/web/src/hooks/usePlaybackController.ts
  - Modified: apps/web/src/hooks/useDisplayOpsSummary.ts
  - Modified: apps/web/src/pages/ImageManagement/index.tsx
  - Modified: apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - Modified: apps/web/src/hooks/useImageAssetReferences.ts
  - Modified: apps/web/src/pages/MqttSettings/index.tsx
  - Modified: apps/web/src/pages/CircuitSettings/index.tsx
  - Modified: apps/web/src/hooks/useDisplayReadiness.ts
  - Modified: apps/web/src/pages/PlaybackSettings/index.test.ts
  - Modified: apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - Modified: apps/web/src/pages/ImageManagement/index.test.tsx
  - Modified: apps/web/src/pages/MqttSettings/index.test.ts
  - Modified: apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - New: apps/web/src/pages/PlaybackSettings/loadModel.test.ts
  - New: apps/web/src/pages/ImageManagement/loadModel.test.ts
  - Removed: none
