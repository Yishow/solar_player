## 1. Bulk Governance Shell

- [x] 1.1 Implement `Preserve bulk table editing as the primary interaction` so `Preserve bulk table editing while strengthening bounded presentation authoring` remains true during the redesign; verify with apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts and a manual multi-row edit review.
- [x] 1.2 Implement `Show row-level display impact and governance risk in circuit settings` so slot impact, validation state, and dirty risk are readable from the table shell itself; verify with apps/web/src/pages/CircuitSettings/viewModel.test.ts.

## 2. Bounded Presentation Authoring

- [x] 2.1 Implement `Replace freeform icon authoring with bounded circuit presentation choices` so icon and presentation edits use a constrained or validated contract instead of arbitrary strings; verify with apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts and a manual icon-edit review.
- [x] 2.2 Implement `Preserve bulk table editing while strengthening bounded presentation authoring` without forcing per-row wizards or route changes; verify with a content review of apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx and manual workflow timing on `/settings/circuits`.

## 3. Threshold and Readiness Semantics

- [x] 3.1 Implement `Promote row-level display impact and threshold risk summaries` so `Keep threshold semantics explicit during governance edits` is observable next to the edited ranges; verify with apps/web/src/pages/CircuitSettings/viewModel.test.ts.
- [x] 3.2 Implement `Keep threshold semantics explicit during governance edits` with page summary to row-level readiness consistency; verify with apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts and a manual readiness-finding review.
