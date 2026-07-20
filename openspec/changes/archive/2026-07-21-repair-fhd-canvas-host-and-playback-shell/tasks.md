## 1. Shared canvas host repair

- [x] 1.1 完成 “Render application routes inside a fixed FHD canvas host” 並對應 ### Introduce a real DisplayCanvas host at the root shell layer，讓 root shell 以 `1920x1080` internal canvas 與 viewport scaling 承載 route content，而不是 centered max-width container + scrollable main；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工縮放 browser viewport 檢查 header、content canvas、footer 的相對幾何不改變。
- [x] 1.2 完成 shared shell chrome 幾何收斂，讓 `AppHeader` 與 `AppFooterNav` 跑在修正後的 canvas host 上且不依賴 page body grid 撐開；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工檢查 root shell 不再出現 route body 滾動把 header/footer 推開的行為。

## 2. Playback shell boundary split

- [x] 2.1 完成 “Separate playback shell structure from management-page scaffold structure” 並對應 ### Split playback shell from PageScaffold instead of overloading one scaffold，讓 playback route 可使用 playback-only shell primitive 或 title-group contract，而 management pages 仍可使用 `PageScaffold` / `PageContainer`；驗證方式為 code review，確認 `PageScaffold` 不再是 playback page 唯一 page-body shell 入口。
- [x] 2.2 完成 `PageScaffold`、`PageContainer`、`TitleBlock` 的責任縮限，讓 management scaffold 不再隱含全站預設畫布模型；驗證方式為 code review，確認 management title/description block 與 playback shell primitive 的 contract 已分開，且沒有把 page-complete alignment 混入本 change。

## 3. Witness validation and scope guard

- [x] 3.1 完成 “Limit this change to shell host repair and witness verification” 並對應 ### Use witness routes only for shell verification, not page completion，選定一條 playback witness route 與一條 management witness route 驗證 shared shell host 與 shell split 生效；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工檢查 witness routes 共用同一 root canvas host 但 page-body shell boundary 已分開。
- [x] 3.2 完成 narrow scope 收尾，確認本 change 沒有聲稱完成 14 頁 page-body reference alignment、page-specific asset binding 或逐頁 absolute composition；驗證方式為內容 review 與 `spectra analyze repair-fhd-canvas-host-and-playback-shell --json`，確認 tasks、design、spec 一致維持 shell-only scope。
