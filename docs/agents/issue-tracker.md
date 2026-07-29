# Issue tracker: Local Markdown

Issues and specs (you may know a spec as a PRD) for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` — never a single combined tickets file
- Standard implementation issue triage is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the five allowed role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

- Product spec → `.scratch/<feature-slug>/spec.md`
- Implementation issue → `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- Wayfinding map or research child → use the exact paths in "Wayfinding operations" below

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Relationship to Spectra

- `.scratch/<feature>/spec.md` captures product intent that may span multiple Spectra changes.
- Each implementation issue is a tracer-bullet delivery slice. Before coding, map it to a bounded named Spectra change as defined in `docs/ops/workflow.md`.
- A standard issue's `Status` only tracks triage routing; the Spectra change's `tasks.md` is the only source of truth for implementation progress, and its archive records delivery completion.
- Reference the change name from the issue instead of copying proposal text or task checkboxes into both places.

## Wayfinding operations

Used by `/wayfinder`. These investigation tickets use a separate state machine from the five triage labels above; do not mix the vocabularies. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `open`/`claimed`/`resolved` and starts as `open`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files with `Status: open` whose blockers are all resolved; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
