## Summary

Add AI-led FHD witness tooling and evidence workflow so the five playback pages can be closed out against `docs/reference/FHD/` without drifting into prototype or management-surface assumptions.

## Motivation

The project is already beyond prototype and the five playback pages are estimated near 70-80% complete. The remaining work is mainly visual precision, editor capability coverage, and repeatable evidence. Today that evidence is still mostly manual, which makes it easy for future AI implementation to fix a screenshot difference with local CSS instead of extending `/display-pages/editor`.

This change creates the tooling and handoff contract for AI-led execution: AI drives analysis, implementation, screenshot capture, and evidence collection; the user owns product intent and final acceptance.

## Proposed Solution

- Add a FHD witness workflow that compares the live React playback routes against the canonical images in `docs/reference/FHD/`.
- Add Playwright-based screenshot capture for the five playback routes and `/display-pages/editor` preview states at 1920x1080.
- Add an evidence bundle format that records route, reference image, current screenshot, viewport, page config source, editor capability used, and remaining gap notes.
- Add guardrails requiring implementation to extend `/display-pages/editor` when a FHD gap cannot be represented by existing controls.
- Keep prototype materials historical only and avoid reintroducing `docs/reference-match/` as an active workflow dependency.

## Non-Goals

- Do not implement final visual tuning for any page in this change.
- Do not add pixel-perfect pass/fail thresholds as a blocking CI gate until baseline screenshots and tolerance are intentionally accepted.
- Do not change media asset sources, MQTT behavior, routing, deployment, or server runtime.
- Do not replace Spectra with a different planning workflow.

## Alternatives Considered

- Manual screenshot review only: rejected because the project needs repeatable AI-led evidence before launch.
- Immediate strict pixel-diff CI: rejected because the current pages are not yet accepted as baselines and strict thresholds would create noisy failures.
- Page-local implementation checklists only: rejected because editor capability coverage is part of the product contract.

## Impact

- Affected specs: ai-led-fhd-witness-tooling
- Affected code/docs:
  - Modified:
    - package.json
    - apps/web/package.json
    - AGENTS.md
    - CLAUDE.md
    - README.md
  - New:
    - docs/fhd-witness/
    - docs/fhd-witness/evidence-template.md
    - docs/fhd-witness/playback-closeout-matrix.md
    - tests or scripts for Playwright screenshot capture under the repo's existing test/tooling conventions
  - Removed: (none)
