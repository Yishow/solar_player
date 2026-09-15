# Domain Docs

How engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`README.md`** at the repo root for product overview, runtime paths, and current commands.
- **`AGENTS.md`** or **`CLAUDE.md`** for repo workflow routing and hard rules.
- **`docs/ops/workflow.md`** and **`docs/ops/conventions.md`** before planning edits or validation.
- **`openspec/specs/`** and **`openspec/changes/`** when the task depends on product behavior, requirements, or active change intent.
- **`docs/reference-match/fhd-workflow-entrypoints.md`** when the task touches playback, display surfaces, or FHD closeout.
- Topic-specific docs such as **`docs/runbooks/`**, **`docs/architecture/`**, or **`docs/reviews/`** only when they match the area you are exploring.

## File structure

> **本 repo 是單一產品 monorepo。** domain vocabulary 與 workflow 入口分散在 root README、docs/ops 與 openspec，而不是 `CONTEXT.md` / `docs/adr/` 佈局。

```
/
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── openspec/
│   ├── specs/
│   └── changes/
├── docs/
│   ├── ops/
│   ├── runbooks/
│   ├── reference-match/
│   ├── fhd-witness/
│   ├── architecture/
│   ├── reviews/
│   └── roadmaps/
├── apps/
└── packages/
```

## Use the repo's vocabulary

When naming a domain concept in a review, hypothesis, refactor note, or test name, prefer the current terms already used by the repo:

- `playback page`, `display page editor`, `management page`
- `witness batch`, `evidence bundle`, `launch witness gates`
- `runtime profile`, `trusted-management`, `playback-safe`

If the term you want is not present in the current docs, specs, or code, prefer the closest existing product term instead of inventing a new synonym.

## Flag contract conflicts

If your output contradicts current source-of-truth docs, surface it explicitly instead of silently overriding it:

- `openspec/` conflict: the behavior or requirement disagrees with the active spec/change.
- `docs/ops/` conflict: the suggested workflow or validation path disagrees with repo rules.
- `reference-match/` conflict: the suggested playback/FHD change would weaken a visual canonical or witness gate.
