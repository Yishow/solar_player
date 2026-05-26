## Why

目前 media effect controls 已可保存 blur/fade 等設定，但視覺表現主要是整張 media 的 CSS filter 或單一淡出遮罩。使用者期待的「霧化」是局部邊緣霧化或柔焦融合效果，特別是 Overview 左側 hero 圖與內容銜接處；現況即使設定存在，也不容易看見效果，造成「功能做完但霧化沒看到」的落差。

## What Changes

- 新增可見的 localized mist/edge blur layer，讓霧化不是只依賴整張圖片 blur。
- 讓 editor preview 與 playback runtime 使用相同效果 rendering path，避免管理面看到和實際播放不同。
- 為 Overview 等需要融合背景的頁面設定可見但保守的預設 edge mist。
- 保留現有 media placement、edge fade、opacity、blur controls，不擴大到未要求的新特效面板。

## Capabilities

### New Capabilities

- `display-page-effect-visual-fidelity`: 定義 display page media effects 必須在 editor 與 playback 中產生可辨識且一致的視覺結果。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-page-effect-visual-fidelity
- Affected code:
  - Modified: apps/web/src/pages/displayPageMediaStyle.ts, apps/web/src/pages/shared/displayPageMediaEffectConfig.ts, apps/web/src/pages/shared/displaySurfaceChrome.css
  - Tests: apps/web/src/pages/displayPageMediaStyle.test.tsx, apps/web/src/pages/displayPageSeeds.test.ts, apps/web/src/pages/shared/displaySurfaceChrome.test.ts, apps/web/src/pages/shared/liveDisplayPagePreview.test.ts, apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
