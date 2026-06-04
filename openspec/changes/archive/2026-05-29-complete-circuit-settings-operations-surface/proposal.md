## Why

`/settings/circuits` 現在已具備 slot binding、threshold editing 與 readiness feedback，但整體仍偏向 raw data-entry grid：icon 仍以自由文字輸入、display impact 與 row risk 被壓在 caption 裡、threshold semantics 與 slot validation 缺少更可操作的 surface。這使它雖然有功能，卻還不像高風險設定頁該有的完整治理工作台。

## What Changes

- 對齊 `Circuit Settings` 的 operations surface tokens，讓 summary strip、readiness feedback、table shell、row state 與 save actions 成為同一套治理語言。
- 強化 circuit row 的 display impact、slot binding、validation、dirty risk 與 threshold semantics，讓 operators 能在 row-level 就理解這筆設定的風險與影響面。
- 將 icon/unit editing 從 raw text field 改為更有邊界的 authoring interaction，避免不受控字串直接決定 display primitive 呈現。
- 保留 bulk save、inline editing、display slot readiness 等既有操作契約，不把高密度工作台拆回低效率逐頁表單。

## Capabilities

### New Capabilities

- `circuit-settings-operations-surface`: 定義 circuit settings 作為 slot binding、threshold governance、display impact triage 與 bulk editing workspace 的完整 surface contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: circuit-settings-operations-surface
- Affected code:
  - New:
    - apps/web/src/components/management/circuitRowImpactSummary.tsx
    - apps/web/src/components/management/circuitRowImpactSummary.test.tsx
  - Modified:
    - apps/web/src/pages/CircuitSettings/index.tsx
    - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
    - apps/web/src/pages/CircuitSettings/viewModel.ts
    - apps/web/src/pages/CircuitSettings/circuitSettings.css
    - apps/web/src/components/icons.tsx
    - packages/shared/src/displayOps.ts
  - Removed:
    - (none)
