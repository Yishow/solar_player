## Context

使用者回報樹莓派上所有頁面切換都慢，尤其 route 已經切到新頁後，內容還要等一段時間才完整載入。程式碼細看後，playback surfaces 的慢點不是單一 animation，而是每次 route entry 都重新啟動 live config、registry、story runtime 或 page-specific runtime hydration。

目前具體熱點如下：

- apps/web/src/pages/shared/displayPageRouteHost.tsx 的 loadDisplayPageRoute 會先讀 registry，再讀 live config，並 prime useDisplayPageConfig cache；DisplayPageRouteHost 掛載後又呼叫 useDisplayPageRegistry。
- apps/web/src/layouts/LayoutShell.tsx 也呼叫 useDisplayPageRegistry，footer metadata 與 route host 各自掛載 registry consumer。
- apps/web/src/hooks/useDisplayPageConfig.ts 只把 cached envelope 當 initial session，但未提供統一的 route-level initial contract；dirty 目前用 JSON.stringify(config) 比對整份 config。
- Overview/Solar/FactoryCircuit/Images/Sustainability 都使用 useDisplayPageConfig(stage live)，其中 Overview/Solar/FactoryCircuit/Sustainability 還有 story runtime hook，Images 有 useImagePlaylistRuntime，FactoryCircuit 另有 loadCircuitsRef 手寫 request lifecycle。
- useRuntimeRefreshLifecycle 每次 enabled 或 refreshKey 改變都會 bootstrap load；沒有 initial payload/stale-while-refresh 模式，導致頁面容易從空 payload 開始。

## Goals / Non-Goals

**Goals:**

- 讓五個 playback route 在樹莓派上切換後能先呈現頁面骨架與可用 fallback，而不是等待所有 runtime payload 完成才完整出現。
- 收斂 route loader、LayoutShell、DisplayPageRouteHost、useDisplayPageRegistry、useDisplayPageConfig 的 registry/live config 重複讀取。
- 將 page-specific runtime payload 分段：live config 為 route-visible 必要資料，story/playlist/circuit runtime 為背景 refresh 或 last-known fallback。
- 簡化重複載入函式，特別是 loadDisplayPageRoute、useRuntimeRefreshLifecycle、useDisplayStoryRuntime、useImagePlaylistRuntime、FactoryCircuit loadCircuitsRef。
- 保留既有 display sync refresh、fallback banner、loading state、runtime error message、playback transition、footer metadata 與 FHD render output。

**Non-Goals:**

- 不導入整頁 keep-alive 或 hidden route cache。
- 不改 server API contract、SQLite schema、MQTT runtime、display-page config schema。
- 不重寫五個 playback page 的視覺、FHD polish、editor capability 或 route shell。
- 不把 runtime failure 靜默視為成功；既有錯誤顯示與 fallback indicator 必須保留。

## Decisions

### Route-visible hydration uses shared registry and live config cache

建立一個 route-visible initial data contract，讓 loadDisplayPageRoute prime 的 registry/live config 能被 LayoutShell、DisplayPageRouteHost、useDisplayPageRegistry 與 useDisplayPageConfig 共用。實作上優先沿用現有 module-level cache 風格，不新增外部 state library。

替代方案是讓每個 component 自己繼續 fetch，但那正是每次切頁都慢的來源。另一個替代方案是把所有資料塞進 root loader，會讓單一 route loader 過胖，也會讓錯誤邊界模糊。

### Playback runtime hooks accept initial payloads and refresh in background

useRuntimeRefreshLifecycle 增加 initial payload / hydrated state 選項，並保持 refreshKey 觸發背景 refresh。useDisplayStoryRuntime、useImagePlaylistRuntime 使用此能力，讓頁面可先使用 last-known 或 seed fallback，再背景拉取新 payload。

替代方案是只加 memoization，但無法避免 async payload 從 null 開始的空窗。這次不改成 React Query，避免引入新依賴與 cache policy 遷移。

### Page-specific runtime data stays outside live config blocking path

Overview/Solar/Sustainability story runtime、Images playlist runtime、FactoryCircuit circuits runtime 都不得阻塞 live config 可見骨架。FactoryCircuit 的 loadCircuitsRef 應收斂成與 useRuntimeRefreshLifecycle 相同語意，保留 request id 防止舊請求覆蓋新資料。

替代方案是把 story/circuit/playlist 併進 display page live config loader，但這會讓 route loader 變慢，且混淆 config correctness 與 runtime telemetry freshness。

### Existing playback behavior and errors remain invariant

每個優化都必須保證功能不缺失、不退化、不藏錯。DisplayPageLoadingState、RuntimeConfigFallbackBanner、story runtime error、playlist fallback、FactoryCircuit loadState error、display sync refresh、playback transition phase 都要維持可觀測行為。

替代方案是為了體感速度直接吞掉 runtime error 或永久使用 seed fallback；這會讓現場問題不可診斷，排除。

## Implementation Contract

Behavior:

- 導向 /overview、/solar、/factory-circuit、/images、/sustainability 時，route host SHALL reuse available registry/live config initial data before starting duplicate fetches.
- playback page SHALL render its visible shell, seed fallback, cached live config, or DisplayPageLoadingState according to the existing defer guard while story/playlist/circuit runtime refresh continues in the background.
- display sync events SHALL still reload the relevant live config and runtime payloads. Dirty draft logic is not part of live playback pages and SHALL NOT be introduced here.
- Runtime failures SHALL remain visible through the same fallback banners, loadState error surfaces, or hook errorMessage fields already used by each page.

Interface / data shape:

- useDisplayPageRegistry SHALL expose the same public result shape: pages, isLoading, errorMessage, reload.
- useDisplayPageConfig SHALL keep its existing result shape and add only optional initial/session inputs if needed.
- useRuntimeRefreshLifecycle SHALL keep payload, isLoading, isRefreshing, errorMessage, usesFallback, lastResolvedAt, refresh and add optional initial payload state if needed.
- useDisplayStoryRuntime and useImagePlaylistRuntime SHALL keep their caller-facing signatures compatible; any new initial payload option must be optional.

Failure modes:

- A failed background refresh SHALL keep the last successful payload when one exists and set errorMessage/usesFallback.
- A failed cold live config load SHALL continue to use seed fallback and surface the existing errorMessage path.
- A failed registry load SHALL preserve the existing fallback navigation behavior to /overview.

Acceptance criteria:

- Unit tests prove route host and hooks do not re-fetch registry/live config when matching initial cache exists.
- Hook tests prove initial payload renders as non-loading while background refresh can update or fail without dropping payload.
- Page tests prove runtime error/fallback indicators are still rendered for failed story, playlist, and circuit runtime loads.
- Existing playback route tests, useDisplayPageConfig tests, useImagesAutoplay tests, runtime refresh tests, and web test command pass.

Scope boundaries:

- In scope: client-side route/hook/page loading behavior for five playback pages.
- Out of scope: server endpoint aggregation, new API endpoints, persistent browser cache, keep-alive route instances, visual redesign.

## Risks / Trade-offs

- [Risk] Shared cache can become stale after registry mutation. → Mitigation: keep display:sync invalidation as the authoritative reload path and test registry mutation refresh.
- [Risk] Background refresh can hide failures if UI keeps last-known payload. → Mitigation: preserve errorMessage and usesFallback, and render existing fallback banners where the page already has one.
- [Risk] Adding initial payload options can increase hook API surface. → Mitigation: make options optional and keep existing callers unchanged unless they participate in staged hydration.
- [Risk] FactoryCircuit currently uses a custom loader. → Mitigation: align semantics gradually with useRuntimeRefreshLifecycle while preserving request id stale-response protection.
