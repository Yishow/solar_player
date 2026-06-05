## 0. Coverage map

- [x] 0.1 Cover requirement `FHD witness tooling SHALL capture playback route evidence` by adding the five-route capture command and reference mapping.
- [x] 0.2 Cover requirement `FHD evidence bundle SHALL classify editor capability coverage` by adding the evidence template and implementation-path classification fields.
- [x] 0.3 Cover requirement `AI-led FHD closeout SHALL keep human acceptance explicit` by documenting AI-led execution, unresolved gap reporting, intentional difference handling, and human acceptance status.
- [x] 0.4 Cover design decision `Start with witness capture before strict visual thresholds` by capturing structured evidence without making pixel thresholds a blocking CI gate.
- [x] 0.5 Cover design decision `Require editor capability classification` by requiring existing-control/new-editor-capability/non-editor/intentional-difference categories.
- [x] 0.6 Cover design decision `Keep AI-led ownership explicit` in root docs and evidence workflow guidance.

## 1. Define FHD witness workflow and reference mapping

- [x] 1.1 Add a five-page FHD closeout matrix that maps `Overview`, `Solar`, `FactoryCircuit`, `Images`, and `Sustainability` to their live route URLs and `docs/reference/FHD/` reference images; verify the matrix does not mention `docs/reference-match/`.
- [x] 1.2 Add an evidence bundle template with fields for route key, live route URL, reference image, current screenshot, viewport, timestamp/run id, editor capability classification, remaining gap notes, and human acceptance status.

## 2. Add screenshot capture tooling

- [x] 2.1 Add a documented Playwright-based command or script that captures 1920x1080 screenshots for the five playback routes into a deterministic evidence directory; verify with a targeted test or dry-run route mapping check.
- [x] 2.2 Add editor preview capture support for `/display-pages/editor` states needed to prove FHD changes are editor-backed; verify the capture flow fails loudly when the app or browser dependency is unavailable.

## 3. Document AI-led closeout guardrails

- [x] 3.1 Update root-facing docs only where needed so AI-led execution responsibilities, human product acceptance, and editor capability-first implementation are unambiguous; verify AGENTS.md, CLAUDE.md, and README.md stay aligned.
- [x] 3.2 Add guidance that gaps unsupported by current editor controls require editor capability work before page-local CSS-only tuning can be considered complete; verify this guidance appears in the evidence workflow.
- [x] 3.3 Run `pnpm --filter @solar-display/web test` or narrower affected tests after tooling/docs changes, then run one local witness capture and record the five generated screenshot paths before marking the change complete.
