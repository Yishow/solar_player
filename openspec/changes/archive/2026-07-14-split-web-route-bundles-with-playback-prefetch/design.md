## Context

router靜態 import所有 management pages；playback host又靜態 import editor runtime definitions，間接載入五個 templates。Vite只輸出一個約388.56 kB gzip entry。既有 route loader會warm config，playback shell已有 crash recovery；拆 bundle必須利用這些邊界而非另造 rotation runtime。

## Goals / Non-Goals

**Goals:**

- management pages離開 initial playback entry。
- playback只載 current template並預載 next effective template。
- initial entry gzip至少下降25%。
- cold/warm rotation無 blank frame且 render/FHD不變。

**Non-Goals:**

- 不改 server、rotation semantics或 editor schema。
- 不轉圖或用 manualChunks掩蓋 imports。
- 不新增第二套 playback registry。

## Decisions

### Lazy-load management routes without bypassing loaders

`apps/web/src/app/router.tsx`移除 management page static imports，使用 React Router lazy回傳 Component與既有 loader。hidden-route wrapper在 lazy module執行前仍先判定 visibility，loaders與 route redirects保持原順序。

ManagementShell本身可留 initial shell chunk；只有 page modules被拆分。react-grab production alias不變。

### Load playback templates through a cached registry

新增 `displayPageTemplateLoaders.ts`，以五個 DisplayPageTemplateKey對應 dynamic import function，cache pending/fulfilled Promise並提供 load/prefetch API。playback host根據 registry instance的 templateKey載入 current module，不再 import editor `runtimePageDefinitions`。

editor route仍可在它自己的 lazy chunk靜態組合五個 authoring definitions；兩邊共享 template keys，不共享 component instance state。

### Prefetch the next effective template

當 playback controller已有 current page與 rotation preview時，沿用 shared getNextPlaybackIndex與 enabled/schedule結果找 next effective page，呼叫 registry prefetch；同時保留既有 peer config warmup。prefetch不改 countdown或 navigation，失敗只記錄並讓真正 render時由既有 recovery boundary處理。

route host在 module pending時保留上一個成功 page；initial cold load顯示既有 playback shell內的 bounded loading state，不回傳空 DOM。dynamic import rejection交給 crash recovery/fallback。

### Enforce the bundle and continuity budget

Vite啟用 manifest輸出。新 checker解析 manifest與 dist assets、計算 gzip，要求 initial entry不超過291.42 kB且至少存在 management與五個 template lazy chunks。checker不只依 filename pattern，也驗 dynamicImports graph。

browser witness跑 cold/warm五頁 rotation；DOM/CSS/source-based tests與 fresh FHD witness驗 render invariance。

## Implementation Contract

- Behavior：/overview初載不下載 management與其他四個 template chunks；next template在 boundary前開始下載。
- Interface：loader registry提供 loadDisplayPageTemplate與 prefetchDisplayPageTemplate，輸入為 DisplayPageTemplateKey，Promise cache同 key共用。
- Failure modes：unknown key回傳明確 error；prefetch rejection不導致 unhandled rejection；current chunk failure進既有 recovery；current page在 next prefetch failure時保持可見。
- Acceptance：web tests、production build、bundle checker、browser cold/warm rotation與 fresh FHD witness全通過。
- In scope：router lazy boundaries、template registry、next prefetch、manifest/budget checker。
- Out of scope：server API、images optimization、editor schema、rotation policy。

## Risks / Trade-offs

- [loader static import殘留使 chunk未拆] → manifest graph test檢查 initial imports與 lazy chunks，而非只看總尺寸。
- [prefetch搶占 current asset頻寬] → current module/config完成後才prefetch next，一次只prefetch一個 effective page。
- [transition顯示 blank] → host保留last successful component且用 shell內 bounded loading，browser witness逐 boundary取樣。
- [dynamic import failure被吞] → prefetch只避免 unhandled rejection；actual render failure仍交給既有 crash boundary並留 log。

## Migration Plan

先拆 management routes並量 entry，再加入 template registry，最後接 prefetch與 continuity witness。任何階段若 budget或 render invariance失敗，回滾到前一個 passing split邊界。
