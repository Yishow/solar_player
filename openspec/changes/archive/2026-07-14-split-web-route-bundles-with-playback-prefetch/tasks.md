## 1. 拆分 management routes

- [x] 1.1 先擴充 `apps/web/src/app/router.test.ts`與manifest fixture，讓「Management routes load outside the playback entry bundle」在現況static imports下失敗；驗證：測試能指出initial graph仍包含management page modules。
- [x] 1.2 依「Lazy-load management routes without bypassing loaders」改用React Router lazy modules，同時保留hidden-route redirect、existing loaders與shell；驗證：router/brand bootstrap/visibility tests通過且initial manifest不再import management pages。

## 2. 建立 playback template chunks

- [x] 2.1 依「Load playback templates through a cached registry」實作 `displayPageTemplateLoaders.ts`及tests，交付「Playback templates load by template key」；驗證：五keys各對應dynamic import、同key共用Promise、unknown key明確失敗。
- [x] 2.2 修改route host與editor definitions，解除playback對editor runtime definitions的static import並在current template pending時保留shell/last successful page；驗證：route host tests證明/overview只要求Overview chunk且current failure進crash recovery。

## 3. Prefetch 與 failure boundary

- [x] 3.1 依「Prefetch the next effective template」修改playback controller，以existing rotation decisions預載next key並保留peer config warmup；驗證：「Next effective playback template is prefetched」tests覆蓋disabled page、loop edge、fallback與同key dedupe。
- [x] 3.2 交付「Chunk failure uses existing recovery boundaries」：prefetch rejection無unhandled rejection，actual current chunk failure由existing recovery/fallback處理且current page不消失；驗證：unit test與browser request-failure witness通過。

## 4. Budget 與 continuity closeout

- [x] 4.1 依「Enforce the bundle and continuity budget」啟用Vite manifest並實作 `scripts/check-web-bundle-budget.mjs`，交付「Production bundle meets the entry budget」；驗證：pnpm build後initial entry<=291.42 kB gzip且manifest有management與五個template chunks。
- [x] 4.2 交付「Bundle splitting preserves playback output and continuity」：執行完整web tests、cold/warm五頁rotation、production build/budget checker與fresh FHD witness；驗證：無blank frame、DOM/CSS/card order不變且FHD evidence無geometry/asset quality regression。
