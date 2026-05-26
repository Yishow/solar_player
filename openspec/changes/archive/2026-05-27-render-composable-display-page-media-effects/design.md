## Context

目前 renderer 依賴 `display-surface-media-fade-left`、`display-surface-media-mist-bottom` 這類固定 class names。這種做法無法表達 top、dual-edge、all-edges，更無法清楚管理多 layer stacking 與 per-zone parameterization。

## Goals

- 讓 renderer 真正吃 canonical effect layers。
- 讓 zone-bounded overlays 與 same-zone stacking 可見且可控。
- 讓 editor preview 與 playback runtime 的 effect rendering 語意一致。

## Non-Goals

- 不在這包定義 editor authoring UI。
- 不在這包決定哪些 page surfaces 開放 rollout。

## Decisions

### Render composable zones from normalized layer data

presentation builder 直接從 normalized effect layers 推導 stage classes、CSS variables 或 render fragments，而不是再從 legacy booleans 拼 class names。

### Separate localized overlay rendering from whole-media filters

localized effects，例如 mist、edge fade、zone blur overlays，要和 full-frame blur/opacity 區分。renderer 必須能同時處理 localized zone effects 與 whole-frame effects，而不是把所有效果都塞進 `img.style.filter`。

### Keep overlays clipped to the media owning layer

所有 zone overlays 必須被 media stage clip 住，不得跨到 shell header/footer 或其他 page content 上。

## Implementation Contract

**Behavior**

- renderer 能處理多個 effect layers，且同 zone 多層效果可疊加。
- full-frame 與 localized zone effects 可以同時存在。
- editor preview 與 playback runtime 使用相同的 layer interpretation。

**Failure modes**

- 若新的 zones 只能序列化卻畫不出來，視為未完成。
- 若 same-zone stacking 會吃掉前一層效果，視為未完成。
- 若 overlays 溢出 owning media layer，視為重大 regression。

## Verification

- `apps/web/src/pages/displayPageMediaStyle.test.tsx` 驗證 layer-to-presentation mapping、stacking 與 clamp。
- `apps/web/src/pages/shared/displaySurfaceChrome.test.ts` 驗證 CSS 與 bounded overlay contract。
- `apps/web/src/pages/shared/liveDisplayPagePreview.test.ts` 驗證 preview/runtime 共同效果語意。
