## Why

Offline Error、Device Status、Brand Assets 這三個 support surface 的共同點是都依賴 guard：offline 需要 minimal fault lane，device 需要 access / safe-op boundary，brand 需要 dirty draft / pending action boundary。把這三頁合成一個 guarded-refresh change，可以把「背景 refresh 不得覆蓋受保護狀態」寫成同一個 safety contract。

## What Changes

- 定義 Offline Error 的 minimal fault lane refresh boundary。
- 定義 Device Status 的 access / partial-success guarded refresh boundary。
- 定義 Brand Assets 的 dirty draft / pending action guarded refresh boundary。
- 加入 no-regression 邊界：reconnect、safe operations、brand draft、access-denied 行為不得退化。

## Non-Goals (optional)

- 不改 API schema。
- 不處理 Energy Trend、Energy History、Slideshow Preview。

## Capabilities

### New Capabilities

- support-offline-device-brand-guarded-refresh: 定義 Offline Error、Device Status、Brand Assets 在 guarded state 下的 background refresh 契約。

### Modified Capabilities

(none)

## Impact

- Affected specs: support-offline-device-brand-guarded-refresh
- Affected code:
  - New: apps/web/src/pages/BrandAssets/index.test.ts
  - Modified: apps/web/src/pages/OfflineError/index.test.ts, apps/web/src/pages/DeviceStatus/index.tsx, apps/web/src/pages/DeviceStatus/index.test.tsx, apps/web/src/pages/BrandAssets/index.tsx
  - Removed: (none)
