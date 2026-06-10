## 1. Playback Settings splits editable config from preview and runtime diagnostics

- [x] 1.1 [P] 交付 Settings pages render editable state before deferred diagnostics：PlaybackSettings 先載入並呈現 settings/pages 編輯狀態，display ops、live preview catalog、rotation diagnostics、runtime countdown 改為背景或延後狀態；驗證 apps/web/src/pages/PlaybackSettings/index.test.ts 覆蓋 editable form 在 deferred diagnostics pending 時已呈現。
- [x] 1.2 [P] 交付 Settings page loaders avoid duplicate blocking reads：PlaybackSettings 的 loadPlaybackConfig 與 usePlaybackController 不再形成 getPlaybackSettings/getDisplayRotationPreview 的雙 cold blocking path；驗證 apps/web/src/pages/PlaybackSettings/loadModel.test.ts 或 index.test.ts 以 fake loader 斷言首屏只需要 editable model。
- [x] 1.3 [P] 交付 Playback Settings splits editable config from preview and runtime diagnostics：LiveRotationPreviewList 與 runtime preview 保留現有 skip reason、countdown、progress、page order 顯示，且 pending/error 不阻塞表單；驗證 apps/web/src/pages/PlaybackSettings/viewModel.test.ts 與 LiveRotationPreviewList 相關測試。

## 2. Live preview catalog uses one load path and bounded background hydration

- [x] 2.1 [P] 交付 Settings page loaders avoid duplicate blocking reads：useLiveDisplayPagePreviewCatalog 合併 bootstrap/load 重複流程，display sync reload 與初始 load 共用同一 catalog loader；驗證 apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts 覆蓋 shared load path、loading states、display-pages sync reload。
- [x] 2.2 [P] 交付 Live preview catalog uses one load path and bounded background hydration：preview catalog 支援先呈現 rotation shell/loading preview state，再背景補齊所有 live config preview；驗證 apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts 和 PlaybackSettings/SlideshowPreview existing preview tests。

## 3. Image Management centralizes library and playlist model loading

- [x] 3.1 [P] 交付 Settings pages render editable state before deferred diagnostics：ImageManagement 使用 shared load/apply model 呈現 assets、storage usage、playlist entries、resolved playlist entries、shuffle、bulk duration、selection，asset health/references 為背景診斷；驗證 apps/web/src/pages/ImageManagement/loadModel.test.ts 與 apps/web/src/pages/ImageManagement/index.test.tsx。
- [x] 3.2 [P] 交付 Settings page loaders avoid duplicate blocking reads：syncImages 與 bootstrap 不再重複 normalize/setState 流程，save 後 resync 與 display sync resync 共用同一 model application path；驗證 index.test.tsx 覆蓋 save 後 selection、playlist entry、bulk duration 不漂移。
- [x] 3.3 交付 Settings optimization preserves functionality and errors：Image upload/save/delete/cover、playlist governance、asset health refresh failure、asset reference failure 都維持既有 feedback 與 dirty state；驗證 apps/web/src/pages/ImageManagement/index.test.tsx 相關行為測試。

## 4. MQTT and Circuit settings defer diagnostics and polling

- [x] 4.1 [P] 交付 Settings pages render editable state before deferred diagnostics：MqttSettings 先呈現 persisted broker/topic/weather controls，weather options、weather preview、readiness、live metrics 與 polling 延後；驗證 apps/web/src/pages/MqttSettings/index.test.ts 覆蓋 persisted controls before deferred sections。
- [x] 4.2 [P] 交付 MQTT and Circuit settings defer diagnostics and polling：topic polling 在初始 topics load 後才啟動，display sync reload 仍會重載 settings/topics/weather/readiness；驗證 apps/web/src/pages/MqttSettings/index.test.ts 以 fake timers 覆蓋 polling start 與 reloadNow。
- [x] 4.3 [P] 交付 Settings pages render editable state before deferred diagnostics：CircuitSettings 先呈現 circuit rows，readiness 背景刷新且不拖住 list 呈現；驗證 apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts 或新增 index-level test。
- [x] 4.4 交付 Settings optimization preserves functionality and errors：MQTT save/test/topic CRUD、password masking、Circuit add/save/delete、dirty guard 與 access denied 行為保持不變；驗證 apps/web/src/pages/MqttSettings/index.test.ts、apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts、apps/web/src/services/api.test.ts。

## 5. Settings behavior and errors remain invariant

- [x] 5.1 交付 Settings optimization preserves functionality and errors：所有 deferred diagnostics failure 保留 editable state，並透過既有 message/error UI 呈現錯誤而非成功；驗證 PlaybackSettings、ImageManagement、MqttSettings、CircuitSettings 的 failure tests。
- [x] 5.2 交付 Settings behavior and errors remain invariant：執行 pnpm --filter @solar-display/web test，並手動檢查 /settings/playback、/settings/images、/settings/mqtt、/settings/circuits 在慢網路或 fake delayed loader 下首屏可見且功能無缺失；驗證結果記錄在 apply 回報。
