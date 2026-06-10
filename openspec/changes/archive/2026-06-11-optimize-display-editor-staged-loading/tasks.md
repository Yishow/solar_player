## 1. Editor route enters with cached registry before runtime definitions build

- [x] 1.1 [P] 交付 Display editor route entry renders before deferred editor data：DisplayPagesEditorRoute 使用 shared registry cache 或 route initialization 先建立 pageDefinitions/fallback definitions，route frame 與 workspace/page controls 不等 registry cold load 才出現；驗證 apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx 或新增 editorStaging.test.tsx。
- [x] 1.2 [P] 交付 Editor route enters with cached registry before runtime definitions build：useDisplayPageRegistry 支援 editor route 重用 snapshot 且 display:sync 後仍會 refresh pageDefinitions；驗證 apps/web/src/hooks/useDisplayPageRegistry.test.ts 與 apps/web/src/pages/DisplayPagesEditor/index.test.tsx。

## 2. Draft config hydration becomes staged and avoids full-object dirty checks

- [x] 2.1 [P] 交付 Display editor draft config hydration avoids repeated full-object work：useDisplayPageConfig draft mode 接受 initial envelope/session，dirty tracking 不依賴每 render 全量 JSON.stringify，且保留 result shape；驗證 apps/web/src/hooks/useDisplayPageConfig.test.ts 覆蓋 initial session、field update、save reset、conflict、undo、redo。
- [x] 2.2 [P] 交付 Draft config hydration becomes staged and avoids full-object dirty checks：DisplayPagesEditor 使用 staged draft config 狀態，draft loading/failure 時保留 seed fallback、message、errorMessage、fallbackPolicy；驗證 apps/web/src/pages/DisplayPagesEditor/index.test.tsx。

## 3. Editor heavy subtrees load by active workspace and tab

- [x] 3.1 [P] 交付 Display editor heavy work is staged by active workspace and tab：getImages 與 assetOptions 改為 asset workspace 或 asset selection 需求時載入，不阻塞 editor route entry；驗證 apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx 與 AssetLibrary integration tests。
- [x] 3.2 [P] 交付 Display editor heavy work is staged by active workspace and tab：useDisplayPageAssetHealth、useDisplayPagePublishingState、source/health/publish panels 在對應 tab active 時刷新，inactive 時保留 invalidation flag；驗證 apps/web/src/pages/DisplayPagesEditor/index.test.tsx 覆蓋 tab activation refresh 與 failure UI。
- [x] 3.3 [P] 交付 Editor heavy subtrees load by active workspace and tab：previewContent 只在 renderPreview 且 preview surface active/required 時建立，loading/degraded state 不阻塞 page/workspace controls；驗證 apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx。

## 4. Preview and inspector calculations stay behaviorally identical

- [x] 4.1 [P] 交付 Display editor heavy work is staged by active workspace and tab：resolveDisplayEditorRegions、resolveDisplayPageFreeformObjectRegions、editableItems、editableItemIds、selectedRegion、inspectorRegion 的計算邊界收窄但輸出等價；驗證 apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx、freeformObjectList.test.tsx、runtimePageDefinitions.test.tsx。
- [x] 4.2 [P] 交付 Preview and inspector calculations stay behaviorally identical：inspector field value、dirty indicator、validation issue、canvas overlay、selection behavior 對相同 config 保持一致；驗證 apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts、canvasInteractions.test.ts、inspectorFields.test.tsx。

## 5. Editor functionality and errors remain invariant

- [x] 5.1 交付 Display editor optimization preserves authoring functionality and errors：page switching、typed inspector controls、canvas drag/resize/nudge/measure、geometry clipboard、asset selection return、shell workspace hydration、save、publish、conflict handling 行為不缺失不退化；驗證 apps/web/src/pages/DisplayPagesEditor/index.test.tsx、canvasInteractions.test.ts、displayEditorGeometry.test.ts、ShellDecorationEditor/index.test.tsx。
- [x] 5.2 交付 Editor functionality and errors remain invariant：deferred image、asset health、publishing、source、preview、shell workspace request 失敗時保留 current draft 並呈現既有 error/degraded UI；驗證 DisplayPagesEditor failure tests 與 ShellDecorationEditor hydration guard tests。
- [x] 5.3 交付 Display editor optimization preserves authoring functionality and errors：執行 pnpm --filter @solar-display/web test，並手動檢查 /display-pages/editor?page=overview、workspace=assets、workspace=shell 的 route entry、save、publish、asset return、shell hydration；驗證結果記錄在 apply 回報。
