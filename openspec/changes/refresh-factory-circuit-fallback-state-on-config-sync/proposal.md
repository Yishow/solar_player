## Why

`Factory Circuit` runtime 目前在 story payload 不足時會回退到 circuits API 作為負載列來源，但 `apps/web/src/pages/FactoryCircuit/index.tsx` 只在初次 mount 抓一次 circuits。當使用者在 `Circuit Settings` 調整 display slot、啟用狀態，或發佈新的 display-page config 之後，`Factory Circuit` fallback rows 仍可能停留在舊資料，直到整頁硬重新整理。

## What Changes

- 讓 `Factory Circuit` 的 fallback circuits source 跟隨既有 `display:sync` runtime invalidation 機制，在 `circuits` 與 `display-pages` 同步後自動重新載入，而不是只靠初次 mount。
- 定義 `Factory Circuit` fallback reload 的 request lifecycle，避免多次同步事件交錯時把較舊的 circuits response 覆蓋成最新畫面。
- 補上頁面層測試，覆蓋「story payload 不足時會回退到 circuits」、「同步後會刷新 fallback circuits」、「失敗時保留既有 fallback/error 呈現」三條行為。

## Non-Goals

- 不拆分 `display-story` API，也不更動 `Factory Circuit` 的版面、文案或 slot-binding semantics。
- 不新增新的 display sync scope；僅沿用既有 `circuits`、`display-pages` runtime invalidation contract。
- 不把 `Circuit Settings` 管理頁或 readiness service 的 reload 邏輯一起重構進此 change。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `factory-circuit-slot-binding-and-alerts`: `Factory Circuit` runtime 在 story fallback 依賴 circuits source 時，必須在相關同步事件後重新解析最新 circuits 與 slot binding，而不是持續顯示初次載入時的 fallback rows。

## Impact

- Affected specs: `factory-circuit-slot-binding-and-alerts`
- Affected code:
  - Modified:
    - `apps/web/src/pages/FactoryCircuit/index.tsx`
    - `apps/web/src/pages/runtimeRefreshRegistry.ts`
    - `apps/web/src/pages/runtimeRefreshRegistry.test.ts`
    - `apps/web/src/pages/FactoryCircuit/viewModel.test.ts`
  - New:
    - `apps/web/src/pages/FactoryCircuit/index.test.tsx`
    - `openspec/changes/refresh-factory-circuit-fallback-state-on-config-sync/specs/factory-circuit-slot-binding-and-alerts/spec.md`
  - Removed:
    - (none)
