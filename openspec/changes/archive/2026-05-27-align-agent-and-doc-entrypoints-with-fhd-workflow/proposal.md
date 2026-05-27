## Why

前面三個 change 已經把 playback FHD visual canonicals、AI evidence workflow、以及 display launch witness gates 寫進正式 Spectra artifacts，但 repo 的入口文件仍分散在 `AGENTS.md`、`CLAUDE.md`、`README.md`、`docs/README.md` 與 repo-local skills。若這些入口不一起對齊，新規範很快就會變成「spec 裡有、入口沒講、agent 各自照舊」的狀態。

## What Changes

- 對齊 agent entrypoints，讓 `AGENTS.md` 與 `CLAUDE.md` 用同一套 FHD / display workflow 語言描述正式入口規則。
- 對齊 human-facing entrypoints，讓 `README.md` 與 `docs/README.md` 清楚指出 FHD reference、reference-match、visual canonicals、evidence workflow 與 launch witness gate 的入口位置。
- 對齊 repo-local skill docs，避免 skill、agent entrypoint、human docs 各自描述不同流程。
- 明確保持 `.codex/hooks.json` 這類 machine-enforced reminder 仍由 evidence-workflow change 管理，避免把所有 workflow 接點混成同一個 ownership bucket。

## Capabilities

### New Capabilities

- `agent-and-doc-entrypoint-alignment`: 定義 repo 入口文件如何同步反映 FHD visual canonicals、AI evidence workflow 與 display launch witness gates。

### Modified Capabilities

(none)

## Impact

- Affected specs:
  - `agent-and-doc-entrypoint-alignment`
- Affected code:
  - Modified:
    - `AGENTS.md`
    - `CLAUDE.md`
    - `README.md`
    - `docs/README.md`
    - `.agents/skills/display-asset-generation/SKILL.md`
    - `.agents/skills/display-asset-generation/README.md`
    - `.agents/skills/product-gap-audit/SKILL.md`
  - New:
    - `openspec/specs/agent-and-doc-entrypoint-alignment/spec.md`
    - `docs/reference-match/fhd-workflow-entrypoints.md`
  - Removed:
    - (none)
