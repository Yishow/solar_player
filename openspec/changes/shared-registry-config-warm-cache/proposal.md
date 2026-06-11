## Why

display page registry 與 live config envelope 已各自有 cache，但 route loader、route host、preview consumer、與 editor / playback consumer 之間仍可能走到重複的 blocking read path。這個 change 要先把 shared warm cache 邊界定清楚，才能避免後續每個 surface 都各自補一套 cache。

## What Changes

- 明確定義 registry 與 live config 的 shared warm cache reuse contract。
- 規範 force refresh、display sync、與 cache miss 的行為，使首屏可見與 authoritative refresh 可以共存。
- 加入 no-regression 邊界：cache reuse 不得改變 fallback、error、或 reload 語意。

## Non-Goals (optional)

- 不處理 preview visible-window loading；那是另一個 change。
- 不處理 page-local rerender 或 editor dirty tracking。

## Capabilities

### New Capabilities

- shared-registry-config-warm-cache: 定義 display page registry 與 live config envelope 的共用 warm cache 邊界與強制 refresh 契約。

### Modified Capabilities

(none)

## Impact

- Affected specs: shared-registry-config-warm-cache
- Affected code:
  - New: (none)
  - Modified: apps/web/src/hooks/useDisplayPageRegistry.ts, apps/web/src/hooks/useDisplayPageConfig.ts, apps/web/src/pages/shared/displayPageRouteHost.tsx
  - Removed: (none)
