## 1. Overview KPI 標題設定契約

- [x] 1.1 依「Add an optional Overview KPI title override to the existing card config」與「Reuse existing display-page persistence and runtime preview」實作「Author Overview KPI card titles independently」：以 TDD 在 apps/web/src/pages/Overview/displayPageConfig.test.ts 與 apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx 證明 OverviewKpiCardConfig 接受 optional titleOverride、五張 KPI inspector 各自暴露 kpiCards.<key>.titleOverride text field，且 legacy config hydration 不需要 migration；驗證指令為 pnpm --filter @solar-display/web test src/pages/Overview/displayPageConfig.test.ts src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx。

## 2. Preview 與 playback 標題解析

- [x] 2.1 依「Resolve non-blank editor override before the runtime metric label」實作「Empty or legacy title configuration preserves the runtime metric label」與「Topic custom names are the source of playback metric display names」：以 TDD 證明非空白 titleOverride 經 trim 後只覆寫匹配的 Overview 卡片標題，而 missing、empty、whitespace-only 都回退 metric.label，且 subtitle、value、unit、footer、icon 與 binding 不變；驗證指令為 pnpm --filter @solar-display/web test src/pages/Overview/displayPageConfig.test.ts src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx。

## 3. 交付驗證

- [x] 3.1 執行 pnpm --filter @solar-display/web test 與 pnpm run build，確認 monorepo build 與本 change targeted tests 通過；完整 web suite 若失敗，必須以檔案與 assertion 證明失敗只來自開始前既有的無關 WIP。以 scoped git diff 確認本 change 只修改 Overview editor/title 與 Spectra artifacts，且既有 WIP 未被本 change 改動。
- [x] 3.2 在可用的本機 base URL 執行 pnpm run fhd:witness -- --base-url <url>，依 docs/fhd-witness/evidence-template.md 記錄 Overview editor authoring、draft preview、publish/playback、blank fallback 與 FHD 畫面差異；以 fresh evidence bundle 和 witness command 成功輸出作為驗證。
