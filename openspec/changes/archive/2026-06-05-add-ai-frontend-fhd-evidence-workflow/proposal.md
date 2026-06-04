## Why

FHD reference 與 visual checklist 已存在，但 AI 在做前端時仍容易因局部最佳化而讓頁面失去整體質感。真正缺少的是一條 evidence-driven workflow：每次碰 FHD 視覺都要先界定 witness batch、保護面、例外與驗證，不再只靠「build 過了」就算完成。

## What Changes

- 新增一套專門給 AI 前端使用的 FHD evidence workflow，要求任何會影響 FHD 視覺的 change 都要帶 witness batch、evidence bundle、exception ledger 與 verification pack。
- 要求 AI 把 playback、management、editor、runtime、geometry 等 concern 拆成可審核的 surface family / witness batch，而不是做成大而混的視覺改動。
- 讓 repo 內的 canonical workflow docs、review templates 與可能的 hook 指向同一套 FHD 前端工作流，降低之後重複 drift。
- 保留 agent-facing 與 human-facing 入口文件同步給專門的 entrypoint alignment change，避免 workflow 本體與入口對齊混在同一個 change。

## Capabilities

### New Capabilities

- `ai-frontend-fhd-evidence-workflow`: 定義 AI 處理 FHD 前端變更時的 witness batch、evidence bundle、exception ledger 與 verification pack。

### Modified Capabilities

- `display-surface-visual-guardrails`: 將 visual checklist 的使用情境延伸到 AI change workflow，讓 checklist 不再只是被動文件。

## Impact

- Affected specs:
  - `ai-frontend-fhd-evidence-workflow`
  - `display-surface-visual-guardrails`
- Affected code:
  - Modified:
    - `openspec/specs/display-surface-visual-guardrails/spec.md`
    - `.codex/hooks.json`
  - New:
    - `docs/reference-match/fhd-evidence-bundle-template.md`
    - `docs/reference-match/fhd-surface-split-guide.md`
    - `docs/reference-match/fhd-exception-ledger-template.md`
    - `openspec/specs/ai-frontend-fhd-evidence-workflow/spec.md`
  - Removed:
    - (none)
