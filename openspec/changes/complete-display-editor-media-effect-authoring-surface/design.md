## Context

目前 `buildDisplayPageMediaEffectFields(...)` 與 shared effect model 只提供：

- `edgeFade(left/right, width)`
- `bottomFade(height)`
- `blur(amount)` 套整張圖
- `opacity(value)` 套整張圖

mist 並不是獨立 effect，而是從 fade 派生出的固定 blur 與固定 opacity overlay。這代表目前系統缺少兩個核心概念：

1. **target zone**：效果要套在哪個區域
2. **effect stacking**：多個效果能不能疊在同一個區域

所以現在即使 UI 補了上方、下方、左邊、右邊幾個選項，底層也還是補丁式模型，不足以支撐後續特效擴充。

## Goals

- 讓 operator 從可見 media surface 出發時，能找到對應的 effect authoring controls。
- 建立統一的 composable effect framework，讓方向、範圍、強度與疊加都走同一套 schema。
- 讓 top、bottom、left、right、dual-edge、all-edges 與 coverage 百分比使用一致的 authoring 語言。
- 維持 effect editing 單一入口，避免 `來源連接` 與 `屬性` 同時長出重複 controls。

## Non-Goals

- 不在此 change 內支援自由手繪遮罩、多邊形 mask、或像 Photoshop 那樣的逐像素編輯。
- 不把所有 page regions 都改成可編輯 effects；只有 schema 宣告支援的 surface 才能開放 controls。
- 不要求第一版一次涵蓋 every possible VFX，但新 effect types 必須能沿用同一套 contract。

## Decisions

### Model media effects as composable effect layers that target explicit zones

effect model 不再以 `edgeFade`、`bottomFade` 這種 one-off booleans 為中心，而是以「effect layer + target zone + parameters」為中心。每個 enabled layer 至少要描述：

- effect type，例如 mist、blur、fade、opacity
- target zone，例如 top、bottom、left、right、top-bottom、left-right、all-edges、full-frame
- percentage-based coverage
- amount / strength / feather 之類的 effect-specific parameters

這樣同一個 zone 才能疊加多種效果，例如 top 20% 同時有 mist 與 blur。

### Support directional and percentage-based controls symmetrically

方向不該只有 left/right/bottom。framework 需要對稱支援 top、bottom、left、right，以及常見組合 edge scopes；coverage 也應以 percentage 表示，而不是分裂成 width-only / height-only 特例欄位。

### Keep page-level support explicit while effect types become extensible

每個 media surface 是否支援 effect authoring、支援哪些 effect types、支援哪些 zones，仍必須由 page schema 或 config 明確宣告。不同的是，宣告內容要從「支援 blur / edgeFade / bottomFade」升級成「支援哪些 effect kinds 與哪些 zones」。

### Resolve visible container selections back to the owning media source

當 operator 點到背景容器、hero container 或主舞台 frame 時，editor 應自動連到真正擁有 effect config 的 source region，並在 `屬性` 顯示對應 controls。若無對應 source，才顯示 unsupported explanation。

### Keep effect editing inside Properties only

`來源連接` 可以顯示 effect stack summary 與「回到屬性調整呈現」，但不得複製可編輯欄位。這樣可以避免兩套表單不一致，也讓 effect authoring 的正式入口維持單一。

## Implementation Contract

**Behavior**

- 點選可見 media container 時，editor 應能把 selection 解析到 effect-capable source region，或明確說明該 surface 尚未支援 effect authoring。
- `屬性` 只在 eligible media surface 上顯示 composable effect layer controls，包括 effect type、zone、coverage、strength/amount、enabled state，必要時包含 layer order。
- 多個 effect layers 可以作用於同一個 media source，且同一個 target zone 可疊加多種效果。
- `來源連接` 只顯示摘要，不提供第二套 effect inputs。

**Data / schema**

- page config 或 region schema 必須能宣告 effect-capable surface，以及該 surface 支援的 effect kinds 與 zones。
- shared effect payload 必須提供可擴充結構，讓未來新增 effect types 時不需要再新增一整組 page-local schema。
- 第一版 migration 可以保留對既有 blur/fade/opacity seed data 的相容讀取，但新的 authoring contract 需以 composable layer model 為主。

**Failure modes**

- 若使用者仍需先手動猜到 source region 才看得到 effect controls，視為未完成。
- 若 top / bottom / left / right / dual-edge / all-edges 仍需靠不同特例欄位拼湊，視為 framework 未完成。
- 若 mist + blur 等效果無法疊加到同一個區域，視為未完成。
- 若 unsupported surface 靜默沒有 controls、也沒有說明，視為未完成。
- 若 `來源連接` 與 `屬性` 同時出現可編輯 effect 欄位，視為 contract 破壞。

## Verification

- `apps/web/src/pages/DisplayPagesEditor/index.test.tsx` 驗證 container selection 能導向 effect-capable source 或顯示 unsupported state。
- `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx` 驗證 eligible 與 ineligible surfaces 的 effect controls 顯示差異，以及 top/bottom/left/right/all-edge zone options。
- `apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx` 驗證 `來源連接` 只顯示摘要與跳轉，不重複可編輯 controls。
- `apps/web/src/pages/displayPageMediaStyle.test.tsx` 驗證 composable effects 的 resolution、clamp、stacking 與 target-zone rendering。
- `apps/web/src/pages/shared/displaySurfaceChrome.test.ts` 驗證 zone-bounded effect overlays 不會溢出 media owning layer。

## Risks / Trade-offs

- [framework 做太小又回到補丁式特例] -> 用 effect layer + zone model，一次把方向、coverage、stacking 語言統一。
- [framework 做太大導致 apply 不可控] -> 第一版只收常見 edge/full-frame zones，不做自由繪製遮罩。
- [支援矩陣不夠明確] -> 以 page config/schema 顯式宣告取代隱式欄位推論。
- [容器 selection 自動跳轉造成困惑] -> 在 UI 上標示目前已連到對應素材區，避免以為 selection 消失。
- [migration 打壞既有 seeded effects] -> 要求 legacy blur/fade/opacity data 有明確相容路徑與回歸測試。
