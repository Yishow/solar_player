## Why

Playback Settings 現在能先顯示 editable form，但 runtime countdown、rotation preview、與 preview rail 仍會放大 rerender 範圍。這頁適合獨立拆出，先把 tick 與 preview isolation 做乾淨，再讓其他 settings 頁共用經驗。

## What Changes

- 把 Playback Settings 的 editable form tree 與 tick / preview subtree 分離。
- 規範 preview rail 更新與 runtime countdown 更新不可重建 page-row form。
- 鎖定 no-regression 邊界：save、reorder、display sync、preview status 行為不得退化。

## Non-Goals (optional)

- 不處理 Image Management、MQTT Settings、Circuit Settings。
- 不處理 shared preview foundation；只處理本頁 consumer 邊界。

## Capabilities

### New Capabilities

- settings-playback-tick-and-preview-isolation: 定義 Playback Settings 的 editable form 與 runtime / preview subtree 隔離契約。

### Modified Capabilities

(none)

## Impact

- Affected specs: settings-playback-tick-and-preview-isolation
- Affected code:
  - New: (none)
  - Modified: apps/web/src/pages/PlaybackSettings/index.tsx, apps/web/src/pages/PlaybackSettings/loadModel.ts
  - Removed: (none)
