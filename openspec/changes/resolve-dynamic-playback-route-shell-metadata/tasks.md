## 1. Resolver 與 route contract

- [x] 1.1 實作 `Decision: Introduce a playback route metadata resolver built on registry instances`，交付 `Resolve playback shell metadata from active registry-backed routes` 行為，讓 duplicate template instance 與自訂 slug 解析出自身 shell metadata，而不是 fallback 到 canonical built-in route；驗證方式為新增 `apps/web/src/app/playbackRouteMeta.test.ts`，並覆蓋 duplicate instance、custom slug 與 unknown slug fallback case。
- [x] 1.2 實作 `Decision: Keep static routeMeta as the source of truth only for management and fixed playback defaults`，交付 `Use resolved playback metadata for offline eligibility` 行為，讓 `LayoutShell` 與 `offlineRouting` 對 registry-backed playback path 使用 resolved metadata，且 reload failure 時保留 last-known-good playback metadata；驗證方式為更新 `apps/web/src/layouts/offlineRouting.test.ts` 與相關 shell tests。

## 2. Shell consumers 與 invalidation 收斂

- [x] 2.1 [P] 更新 footer/navigation consumer，交付 `Build playback footer entries from resolved playback route metadata` 行為，讓播放 footer 的順序、label 與 active state 跟隨 active registry snapshot，而不是靜態 `routeMetaList`；驗證方式為更新 `apps/web/src/components/shellFoundation.test.ts` 或新增對應 footer tests，覆蓋 duplicate instance 與 archive/disable 後的 entry removal。
- [x] 2.2 實作 `Decision: Refresh shell metadata consumers through the existing display-pages invalidation path`，交付 `Invalidate display page registry clients after registry mutations` 行為，讓 route host、footer、offline routing 在 slug、display order、enabled 或 archive 變更後都能在同一輪 registry refresh 收斂；驗證方式為擴充 `apps/web/src/pages/shared/displayPageRouteHost.test.ts` 與 display-sync related tests，確認不需 full browser reload。

## 3. 整合驗證

- [x] 3.1 [P] 執行 `pnpm --filter @solar-display/web test`，確認 `Resolve playback shell metadata from active registry-backed routes`、`Build playback footer entries from resolved playback route metadata`、`Use resolved playback metadata for offline eligibility` 與 `Invalidate display page registry clients after registry mutations` 的 regression coverage 全數通過。
- [x] 3.2 執行 `pnpm --filter @solar-display/web build` 與 `spectra analyze resolve-dynamic-playback-route-shell-metadata --json`，確認 playback shell metadata resolver 不引入 build regression，且 proposal/design/spec/tasks 對 scope 與 handoff contract 保持一致。
