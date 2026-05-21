## 1. autoplay runtime contract

- [x] 1.1 實作 `Decision: Derive autoplay timing from the resolved active playlist entry`，交付 `Treat Images as a playlist domain with ordered entries` 的 duration-driven autoplay 行為，讓 `Images` page 依 resolved active entry 的 `durationSeconds` 自動前進；驗證方式為新增 `apps/web/src/hooks/useImagesAutoplay.test.ts`，覆蓋不同 entry duration 的 auto-advance 次序。
- [x] 1.2 [P] 實作 `Decision: Reset autoplay only when the active slide identity changes`，交付 manual next/prev、thumbnail click 與 runtime refresh 後重新以新 slide duration 計時的 contract，避免每次 render 都重置 timer；驗證方式為在 `useImagesAutoplay.test.ts` 覆蓋 manual navigation reset 與 refresh remap case。

## 2. page integration 與 fallback loop

- [x] 2.1 [P] 實作 `Decision: Keep manual navigation and fallback entries inside the same autoplay loop`，交付 fallback-active entry 與 single playable entry 仍留在 slideshow loop 的行為，讓 autoplay 不因 placeholder/use-cover slide 而中斷；驗證方式為更新 `apps/web/src/pages/Images/viewModel.test.ts` 與 autoplay tests。
- [x] 2.2 將 autoplay hook 接入 `apps/web/src/pages/Images/index.tsx`，交付 arrows、thumbnail selection 與 autoplay 共用同一個 active index source of truth 的行為；驗證方式為更新 `apps/web/src/pages/Images/layout.test.ts` 或對應 page tests，確認進度條與 active thumbnail 會跟著 autoplay/手動切換收斂。

## 3. 整合驗證

- [x] 3.1 [P] 執行 `pnpm --filter @solar-display/web test`，確認 `Treat Images as a playlist domain with ordered entries` 的 autoplay、manual navigation 與 fallback loop regression coverage 全數通過。
- [x] 3.2 執行 `pnpm --filter @solar-display/web build` 與 `spectra analyze add-images-playlist-autoplay-runtime --json`，確認 `Images` autoplay runtime 不引入 build regression，且 proposal/design/spec/tasks 的 scope 與 handoff contract 一致。
