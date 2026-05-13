## 1. Shell Foundation

- [x] 1.1 完成 “Provide the shared FHD shell foundation before downstream page alignment” 並對應 ### Extract the shared shell before any route-specific batch，盤出 `LayoutShell`、`AppHeader`、`AppFooterNav`、`PageScaffold`、`PageContainer`、`PageNumberPill`、density variants 與 ### Shared shell family completion criteria 的完成條件；驗證方式為內容 review，確認 shell contract 與 shell witness routes 已定義。
- [x] 1.2 完成 `fhd-shell-foundation` 的共享殼層重構，讓 `/overview` 與 `/settings/playback` 共用同一套 shell family，並以 shell witness routes 進行驗證；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工檢查兩條 route 的 header、footer、page number、content canvas 一致。
- [x] 1.3 完成 “Expose reusable shell primitives and density variants”，建立後續 batches 可重用的 title block、section wrapper、status pill、action cluster、media slot 與 density rules；驗證方式為 code review，確認 shell primitives 可被後續批次直接引用。

## 2. Mapping Baseline

- [x] 2.1 完成 “Create the 14-page prototype-to-runtime baseline mapping” 並對應 ### Create a durable 14-page mapping baseline before visual migration，逐頁列出 `01-14` 的 prototype page、runtime route、page file、shared primitives 與 major runtime data source；驗證方式為內容 review，確認無漏頁且無「same as previous」占位寫法。
- [x] 2.2 完成 “Classify mapping rows as runtime-bound, reference-only, or fallback-only”，為每頁主要區塊標示 runtime-bound、reference-only、fallback-only；驗證方式為內容 review，確認 prototype sample value 沒有被寫成新的 runtime requirement。
- [x] 2.3 完成 “Publish the downstream verification matrix” 並對應 ### Gate downstream phases on shell and mapping evidence，為後續 playback、settings、monitoring batches 列出 build、test、manual review targets；驗證方式為內容 review，確認每個下游 batch 至少有一條命令驗證與一條人工驗證。
