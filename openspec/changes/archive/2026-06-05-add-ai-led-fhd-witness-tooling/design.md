## Context

The FHD closeout needs two kinds of proof:

- Visual proof that the five playback routes align with `docs/reference/FHD/`.
- Product proof that remaining adjustments are handled through `/display-pages/editor` capabilities whenever the editor is the expected maintenance surface.

The root docs now describe the project as AI-led with human-owned product intent and acceptance. This change turns that wording into a repeatable workflow without forcing strict CI pixel gates before the visual baselines are accepted.

## Goals / Non-Goals

**Goals:**

- Add an AI-led evidence workflow for the five playback pages: `Overview`, `Solar`, `FactoryCircuit`, `Images`, and `Sustainability`.
- Add Playwright screenshot capture for live playback routes and editor preview states at 1920x1080.
- Record whether each remaining FHD gap is solved by an existing editor control, a new editor capability, or a separately proposed product change.
- Keep `docs/reference/FHD/` as the active visual reference source.

**Non-Goals:**

- Final page polish implementation.
- Strict CI visual regression gating.
- Reintroduction of prototype-stage workflow docs as the active source of truth.
- Backend, deployment, route, or data-source changes.

## Decisions

### Start with witness capture before strict visual thresholds

The first version SHALL capture screenshots and structured evidence. Pixel-diff thresholds MAY be added later only after the team accepts baseline screenshots and tolerances. This prevents noisy failures while still giving AI implementers concrete evidence.

### Require editor capability classification

Every FHD gap in the evidence bundle SHALL identify its implementation path:

- Existing editor control.
- New editor capability required.
- Non-editor product/system change required.
- Intentional difference accepted by the user.

This keeps the default path aligned with the user preference: when the editor cannot satisfy a playback page adjustment, modify the editor rather than patching page-local code only.

### Keep AI-led ownership explicit

The workflow SHALL say that AI leads implementation, screenshot capture, evidence collation, and Spectra task hygiene. The user remains responsible for product intent, final visual acceptance, and deciding when an intentional difference is acceptable.

## Implementation Contract

- **Behavior**: A contributor can run a documented command to capture 1920x1080 screenshots for `/overview`, `/solar`, `/factory-circuit`, `/images`, `/sustainability`, and relevant `/display-pages/editor` preview states. The output SHALL be organized by route and timestamp or run id.
- **Interface / data shape**: Evidence SHALL be recorded in a markdown or JSON-compatible bundle that includes route key, live route URL, reference image path under `docs/reference/FHD/`, current screenshot path, viewport, editor capability classification, and gap notes.
- **Failure modes**: If Playwright or a browser dependency is unavailable, the command SHALL fail with an actionable message and SHALL NOT silently mark witness evidence complete.
- **Acceptance criteria**:
  - A documented local command captures screenshots for all five playback routes at 1920x1080.
  - The evidence template makes it explicit whether each gap is editor-backed, needs editor work, needs non-editor work, or is accepted as intentional.
  - The workflow does not depend on `docs/reference-match/`.
  - Root docs continue to identify prototype artifacts as historical context only.
  - Targeted checks verify the screenshot route list and reference path mapping.
- **Scope boundaries**:
  - In scope: documentation, Playwright capture script or tests, evidence templates, command wiring, reference mapping, editor capability classification.
  - Out of scope: final UI tuning, strict CI gates, backend/server runtime behavior, media source changes.

## Risks / Trade-offs

- [Risk] Screenshot evidence without pixel thresholds can still miss subtle drift. Mitigation: require route/reference/current screenshot pairing plus explicit gap notes, then add thresholds after baseline acceptance.
- [Risk] Tooling can become noisy if it captures management pages. Mitigation: limit launch closeout capture to the five playback pages and editor preview states needed to prove editor capability coverage.
- [Risk] AI-led wording could imply user approval is unnecessary. Mitigation: keep final acceptance explicitly human-owned.
