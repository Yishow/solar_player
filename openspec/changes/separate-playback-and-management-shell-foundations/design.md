## Context

目前兩個 shell 其實只差一層 `<div data-shell-primitive="management-scroll">`，但外層都仍是 `DisplayCanvas`。這意味著：

- playback 的 fixed FHD scale assumptions 影響所有管理頁
- editor/settings/status 的寬高與 scroll 行為要繞過 playback canvas 才能工作
- 殼層 bug 常被誤判成頁面內容 bug

## Goals / Non-Goals

**Goals**

- 讓 playback 與 management 有不同的 shell primitive。
- 讓 management page 使用正常 admin layout，而不是被 FHD playback canvas 包住。
- 保留 route grouping 與共用 header/nav 的一致性。

**Non-Goals**

- 不重畫既有 display pages。
- 不在這個 change 做 route registry generalization。

## Decisions

### DisplayCanvas is playback-only

決策：`DisplayCanvas` 只服務 playback group。

理由：它的固定尺寸與縮放語意本來就是為展示播放頁設計，不應再承擔 admin shell。

### Management shell should own normal scrolling and width

決策：management shell 直接提供 full-width / full-height / scrollable admin container。

理由：settings、editor、status 類頁面本質上是管理工具，不需要被壓進 1920x1080 的展示框。

### Shared brand chrome can stay, layout strategy cannot

決策：可以共用 header/footer/nav 元件，但不能共用同一套 canvas sizing。

理由：品牌一致性與 layout geometry 是兩個層次，現在混在一起才會讓殼層責任不清。

## Implementation Contract

1. playback routes SHALL continue using fixed FHD `DisplayCanvas`.
2. management routes SHALL render inside a dedicated management shell that is not scaled by playback canvas rules.
3. shared chrome MAY reuse brand/header/footer components, but MUST not inherit playback-only sizing assumptions.
4. display editor and settings pages MUST be able to use full viewport space in management mode.

## Risks / Trade-offs

- shell 拆分後，少數共用元件可能暴露出隱含依賴 playback canvas CSS 的問題。
- 若 route meta 與 shell resolution 沒同步，可能出現單一路由落到錯誤 shell。
- 若 management shell 做得太獨立，可能讓品牌一致性下降，需要保留適度共用 chrome。
