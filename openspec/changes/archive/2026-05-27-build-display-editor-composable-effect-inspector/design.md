## Context

目前 effect controls 只是一串欄位，沒有 layer 概念，也沒有 zone-aware UI。換句話說，就算底層 schema 已能表達多層效果，editor 也還是無法自然地新增第二層、排序、或理解「這一層套在哪裡」。

## Goals

- 讓 `屬性` 成為正式的 composable effect authoring surface。
- 提供 layer lifecycle 與 per-layer parameter editing。
- 保持 container selection 到 owning source 的自動導向。

## Non-Goals

- 不在這包做 page rollout matrix。
- 不在這包設計 presets 與 review guardrails。

## Decisions

### Represent effects in the inspector as a layer list

inspector 以 layer list 為主體，每層都能：

- enable/disable
- choose effect kind
- choose zone
- edit coverage / strength / feather
- reorder or delete

### Route visible container selections to the owning effect source

畫布上的可見背景或 stage container 只是入口，不是 effect data owner。editor 必須把 selection 導到真正的 media source，讓 operator 不必猜 region tree。

### Keep Source Connection summary-only

effect 可編輯表單只存在 `屬性`。`來源連接` 可以顯示 effect stack summary 與跳轉，但不重複一套半成品欄位。

## Implementation Contract

**Behavior**

- eligible media selection 顯示 composable effect inspector。
- inspector 可新增第二層以上的效果，不限單一效果。
- 非支援 surface 顯示 explanation。

**Failure modes**

- 若 inspector 無法新增第二層效果，視為未完成。
- 若畫布點選仍需手動猜對 source 才看得到 effects，視為未完成。
- 若 `來源連接` 再長出可編輯欄位，視為 contract 破壞。

## Verification

- `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx` 驗證 layer list、per-layer fields、unsupported states。
- `apps/web/src/pages/DisplayPagesEditor/index.test.tsx` 驗證 container-selection routing。
- `apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx` 驗證 summary-only boundary。
