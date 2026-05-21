## 1. shared preview catalog 對位

- [x] 1.1 實作 `Decision: Separate preview renderer identity from preview state identity`，交付 `Resolve live display preview state by page instance` 行為，讓 shared preview catalog 對 `pageKey` / page instance 保留獨立 state，而不是把 duplicate template instances 折疊成單一 `templateKey` state；驗證方式為新增 `apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts`，覆蓋 duplicate instance 不共用 preview state 的案例。
- [x] 1.2 [P] 實作 `Decision: Load instance-aware preview state from registry-backed live config reads`，交付對 active registry page list 逐一產生 instance-aware preview state 的 contract，讓 archived、unpublished 與 ready instance 都能保留自己的 state；驗證方式為更新 `apps/web/src/pages/shared/liveDisplayPagePreview.test.ts` 或 catalog tests，覆蓋 instance-specific loading/unpublished/asset-unavailable fallback。

## 2. consumer 與 fallback semantics

- [x] 2.1 [P] 實作 `Decision: Keep consumer fallback behavior explicit when instance lookup fails`，交付 `Keep template renderers separate from instance state lookup` 行為，讓 `Playback Settings` preview tiles 在找不到某 instance state 時顯示該 instance 的 fallback，而不是借用同 template 的 ready preview；驗證方式為更新 `apps/web/src/pages/PlaybackSettings/index.test.ts` 或 preview list tests。
- [x] 2.2 實作 `Show effective rotation debugging in Slideshow Preview` 的 instance-aware 更新，交付 duplicate template cards 各自顯示對應 preview state 的行為，並保持 skip diagnostics 不變；驗證方式為更新 `apps/web/src/pages/SlideshowPreview/index.test.ts`，覆蓋 `overview` / `overview-2` 顯示不同 live preview 的案例。

## 3. 整合驗證

- [x] 3.1 [P] 執行 `pnpm --filter @solar-display/web test`，確認 `Resolve live display preview state by page instance`、`Keep template renderers separate from instance state lookup` 與 `Show effective rotation debugging in Slideshow Preview` 的 regression coverage 全數通過。
- [x] 3.2 執行 `pnpm --filter @solar-display/web build` 與 `spectra analyze key-live-display-previews-by-page-instance --json`，確認 instance-aware preview catalog 不引入 build regression，且 proposal/design/spec/tasks 的 scope 與 handoff contract 一致。
