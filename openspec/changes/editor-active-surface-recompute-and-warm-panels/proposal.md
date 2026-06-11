## Why

DisplayPagesEditor 的第二個高風險 hotspot 是 active surface recompute：region tree、preview、inspector、canvas overlay、publish / health / asset panel 目前還容易跟整體 config 一起重算。這部分和 dirty tracking 不同，適合拆成另一個 change，避免一次同改兩個高風險層。

## What Changes

- 定義 active workspace / page / selection 驅動的 recompute boundary。
- 定義 asset、publishing、health panel 的 warm-data reuse 與 partial-failure boundary。
- 加入 no-regression 邊界：selection、preview、publish、health、asset panel 行為不得退化。

## Non-Goals (optional)

- 不處理 dirty tracking；那是另一個 change。
- 不新增 editor capability 或 schema。

## Capabilities

### New Capabilities

- editor-active-surface-recompute-and-warm-panels: 定義 DisplayPagesEditor 的 active-surface recompute 邊界與 warm support panel 契約。

### Modified Capabilities

(none)

## Impact

- Affected specs: editor-active-surface-recompute-and-warm-panels
- Affected code:
  - New: apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - Modified: (none)
  - Removed: (none)
