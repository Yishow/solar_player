## Context

`PlaybackSettings.brightness`（number, 預設 100）與 `orientation`（"landscape" | "portrait"）已存在於 `packages/shared/src/types.ts`、server seed 與 PlaybackSettings UI，但 `DisplayCanvas` 渲染時未消費這兩個值。`controller.settings` 在 `LayoutShell` 已可取得（transitionType/Speed 已使用），可直接傳入 `DisplayCanvas`。

## Goals / Non-Goals

**Goals:**
- brightness 套用為 surface 級 CSS filter，100% 為 identity。
- orientation portrait 以 rotate 90° 呈現，landscape identity。
- 旋轉/亮度只作用於最外層 playback surface，不改各頁 1920×1080 內容座標。
- 補足 image playlist seed 使 4-up 可驗。
- 既有 build 錯誤修復，`pnpm run build` 綠。

**Non-Goals:**
- 不改 settings schema/UI、不改 FHD 內容佈局、不碰 rotation/schedule/idle 行為。

## Decisions

### Surface-level pure style helper

新增 `displayCanvasSurfaceStyle.ts`，純函式 `resolveDisplayCanvasSurfaceStyle({ brightness, orientation })` 回傳 `CSSProperties`：
- brightness：`filter: brightness(<b/100>)`；`b` clamp 到合理範圍（0–200），缺值或 100 時不輸出 filter（identity）。
- orientation：`portrait` → `transform: rotate(90deg)` 並以對調的寬高（100vh×100vw）填滿；`landscape`/缺值 → 不輸出 transform。
此 helper 為 immutable、可單元測試，套用點在 `DisplayCanvas` 最外層 viewport。

### Settings flow

`LayoutShell` 將 `controller.settings?.brightness`、`controller.settings?.orientation` 傳給 `DisplayCanvas`；`DisplayCanvas` 用 helper 算出 viewport style。settings 未載入時以預設（brightness 100、landscape）= identity，不破壞現有畫面。

### Image seed

於 `apps/server/src/db/seed.ts` 補 ≥4 筆 image playlist/asset seed（沿用現有 image 資料表與 playlist 結構），使 `/images` 渲染 4-up thumbnail；不改 image API 或上傳限制。

### Build fixes（pre-existing）

- `displayTransition.ts::resolveDisplayTransitionMode`：`transitionType` 為 `PlaybackTransitionType | undefined`，回傳前需窄化 undefined（`shouldAnimateTransition` 為 true 且 transitionType 存在才回傳，否則 "none"）。
- `fhdEditorCapabilityGapLedger.test.ts`：修 `string | undefined` 取值的型別錯誤（加 guard 或 non-null 斷言於測試取值處）。

## Implementation Contract

**Observable behavior:** 調整 brightness 後 playback 畫面整體變亮/變暗；orientation=portrait 時整個 playback surface 旋轉 90°；landscape/預設不變。`/images` 顯示 4 張 thumbnail。`pnpm run build` 通過。

**Interface / data shape:** 只新增一個 pure style helper 與其 test，消費既有 `PlaybackSettings` 欄位；不新增 settings 欄位或 API。

**Failure modes:** settings 未載入 → 套預設 identity，不得讓畫面變黑或旋轉錯誤。brightness 非法值 → clamp。

**Acceptance criteria:** helper 單元測試（identity / brightness / portrait）通過；DisplayCanvas 消費測試通過；image seed 後 `/images` witness 顯示 4-up；`pnpm --filter web test`、`pnpm --filter server test`、`pnpm run build` 全綠；運行 app 手動確認 brightness/orientation 生效。

**Scope boundaries:** 不改 FHD 內容座標、settings schema、rotation/schedule/idle、editor、playback 頁 actual-gap。

## Risks / Trade-offs

- [Risk] portrait rotate 90° 在橫向實體螢幕上會變橫躺 → 這是預期行為（為直立實體螢幕設計），由 operator 依實體安裝選擇；landscape 仍為預設。
- [Risk] 全 surface filter 影響效能 → brightness 100 時不輸出 filter，避免無謂 compositing。
- [Risk] image seed 與既有上傳資料衝突 → seed 用 upsert/固定 id，避免重複。
