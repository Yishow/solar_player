## Context

/display-pages/editor 是本 repo 最重的單頁之一。使用者指出 editor 也會每次進頁慢，程式碼細看後，慢點不只是 route 架構，而是 DisplayPagesEditorRoute 與 DisplayPagesEditor index 在掛載時同步建立大量狀態、資料載入與計算。

具體熱點如下：

- apps/web/src/pages/DisplayPagesEditor/runtime.tsx 掛載時呼叫 useDisplayPageRegistry，從空 pages 開始，再 buildRuntimePageDefinitions。editor route 不在 ManagementShell loader children 內，因此它自己建立 ManagementShellFrame。
- apps/web/src/pages/DisplayPagesEditor/index.tsx 在同一個 render path 建立 selectedPage、seedConfig、useDisplayPageConfig(stage draft)、freeformObjects、editableRegions、editableFreeformObjects、editableItems、editableItemIds、selectedRegion、inspectorRegion、lockedObjectIds、publishing state、asset health、image list、previewContent、asset options、source connection region。
- useDisplayPageConfig 的 dirty 判斷使用 JSON.stringify(config) !== JSON.stringify(lastLoadedConfig)，對 draft config 大物件每次 render 都有成本。
- resolveDisplayEditorRegions 與 resolveDisplayPageFreeformObjectRegions 會遍歷 config/schema；inspectorFields 裡 getValueAtPath、dirty check、validation issue resolution 在 inspector UI render 時也會多次讀 path。
- previewContent 使用 React.createElement(selectedPage.renderPreview, config)，只要 config 變化就可能重建重型 preview 子樹。
- getImages 在 editor mount 時抓完整 image list；useDisplayPageAssetHealth 與 useDisplayPagePublishingState 也一起掛載，即使 operator 目前不在 assets/health/publish workspace。
- Shell workspace 與 AssetLibrary 是 integrated workspace，先前已有 hydration guard bug 歷史，這次拆分必須避免 placeholder 狀態回推 parent。

## Goals / Non-Goals

**Goals:**

- 讓 /display-pages/editor route 先呈現 editor frame、page/workspace selection 與必要 loading state，再分段載入 registry、draft config、assets、health、publishing、preview、inspector。
- useDisplayPageRegistry 與 useDisplayPageConfig 支援 route/cache initial data，避免 editor 每次從空 registry 與空 draft session 開始。
- 降低 useDisplayPageConfig 每 render 的 dirty comparison 成本，保留 undo/redo/save/conflict 行為。
- 將 heavy preview 與 inspector 計算限制在 active workspace、active tab、selected page/region 所需範圍。
- 保留 display editor 所有功能：page switching、typed inspector fields、canvas drag/resize/nudge/measure、geometry clipboard、asset workspace、shell workspace、save/publish/conflict、fallback/validation messages。

**Non-Goals:**

- 不改 editor 視覺版型、不移除右側 tabs、不縮減 page authoring coverage。
- 不改 display page config schema、publishing API、asset API、shell decoration API。
- 不引入 virtualized editor tree 或整頁 keep-alive。
- 不把 validation/publish/health 錯誤吞掉；錯誤必須保持 operator 可見。

## Decisions

### Editor route enters with cached registry before runtime definitions build

DisplayPagesEditorRoute 使用 shared registry cache 或 route loader initial data，先提供 pageDefinitions 或 fallbackPageDefinitions，避免每次進 editor 都從空 registry 開始。buildRuntimePageDefinitions 只在 registry snapshot 變更時執行。

替代方案是保留 useDisplayPageRegistry cold load；這會讓 editor 入口每次先走 fallback definitions，再更新成 runtime definitions，增加 render churn。

### Draft config hydration becomes staged and avoids full-object dirty checks

useDisplayPageConfig 的 draft mode 應能接受 initial envelope/session，並把 dirty 判斷改成 session 級 dirty flag 或 update-time comparison，避免每次 render stringify 整份 config。save/conflict/undo/redo/resetPaths 仍必須以 lastLoadedEnvelope 和 history 為準。

替代方案是只把 JSON.stringify 包 useMemo；目前 config 和 lastLoadedConfig 本身會隨 update 改變，仍會在大型 draft 上昂貴。

### Editor heavy subtrees load by active workspace and tab

image list、asset options、asset workspace、asset health、publishing state、source panel、health panel、previewContent、inspector field validation 應依 workspace/tab/selection 分段。editor main shell 與 selected page controls 先可見；preview 與 inspector 有自己的 loading/degraded state。

替代方案是拆成更多 React.memo，但如果所有 heavy hooks 仍在 mount 時執行，首屏成本不會消失。

### Preview and inspector calculations stay behaviorally identical

resolveDisplayEditorRegions、resolveDisplayPageFreeformObjectRegions、previewContent、DisplayEditorCanvasOverlay、inspector field dirty/validation 計算可以分段與 cache，但輸出的 editable item ids、labels、geometry、dirty flags、validation messages、selection behavior 必須一致。

替代方案是減少 inspector fields 或 preview fidelity；這會造成功能缺失，排除。

### Editor functionality and errors remain invariant

所有 staged loading 必須保留功能不缺失、不退化、不藏錯。save/publish、draft conflict、asset selection return、shell workspace hydration guard、canvas interaction、geometry clipboard、measurement overlay、health/publish/source tabs 的錯誤都必須維持。

## Implementation Contract

Behavior:

- Navigating to /display-pages/editor SHALL show the editor route frame, workspace/page controls, and a clear loading state before all optional diagnostics/assets/preview subtrees complete.
- Switching page or workspace SHALL keep existing selection/reset semantics and SHALL NOT push placeholder shell or asset state into parent before hydration completes.
- Draft config hydration SHALL preserve save, undo, redo, reset paths, conflict handling, fallback policy, validation messages, and publishing guard behavior.
- Preview and inspector SHALL produce the same authorable regions, freeform objects, labels, field values, dirty indicators, validation issues, and canvas overlays for equivalent config.
- Deferred asset/health/publish/source failures SHALL be surfaced in existing UI locations and SHALL NOT be treated as successful loads.

Interface / data shape:

- DisplayPagesEditorRoute props remain compatible: initialEditorState and renderPreview.
- DisplayPagesEditor pageDefinitions/renderPreview/onEditModeChange contract remains compatible.
- useDisplayPageConfig result shape remains compatible; optional initial session inputs are additive.
- No server API request/response shape changes are in scope.

Failure modes:

- Registry load failure SHALL keep fallback page definitions and surface existing error if available.
- Draft config load failure SHALL keep seed fallback/session behavior and expose errorMessage.
- Deferred image, asset health, publishing, source, or shell workspace failures SHALL keep editor shell usable and show the existing error surface.

Acceptance criteria:

- Focused tests prove editor frame/page controls render before deferred images/health/publishing/preview finish.
- Hook tests prove draft dirty tracking no longer depends on full stringify on every render and still detects config changes, save reset, conflict, undo, redo.
- Existing DisplayPagesEditor tests continue to pass, including page selection, workspace switching, asset workspace, shell workspace, geometry, and publishing status.
- Web tests pass.

Scope boundaries:

- In scope: DisplayPagesEditor route/client loading, shared registry/config hook support needed by editor, editor heavy subtree staging.
- Out of scope: visual redesign, new editor capabilities, schema migration, server changes, persistent browser cache.

## Risks / Trade-offs

- [Risk] Staging editor subtrees can create temporary empty panels. → Mitigation: use existing loading/degraded messages and keep controls visible.
- [Risk] Dirty tracking refactor can break save/conflict semantics. → Mitigation: test initial, dirty, save, conflict, reset, undo, redo transitions directly.
- [Risk] Workspace-based hook gating can miss display sync updates. → Mitigation: background invalidation flags must queue refresh for inactive diagnostics and reload when tab/workspace becomes active.
- [Risk] Integrated ShellDecorationEditor can regress hydration guard. → Mitigation: keep hasHydratedInitialData style guard and test switching away during async hydration.
