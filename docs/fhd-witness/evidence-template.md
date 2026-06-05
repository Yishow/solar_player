# FHD Witness Evidence Template

Use this template for each AI-led closeout witness run. Generated bundles should keep the same fields so screenshot evidence, editor capability coverage, and human acceptance stay separate.

## Run Summary

- route key:
- live route URL:
- reference image:
- current screenshot:
- viewport: 1920x1080
- timestamp / run id:
- editor capability classification:
- remaining gap notes:
- human acceptance status: pending / accepted / rejected

## Playback Witness Rows

| route key | live route URL | reference image | current screenshot | viewport | timestamp / run id | editor capability classification | remaining gap notes | human acceptance status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| overview | `/overview` | `docs/reference/FHD/01-1.Overview (大).png` | `docs/fhd-witness/runs/<run-id>/playback/overview.png` | 1920x1080 | `<run-id>` | `<classification>` | `<notes>` | pending human review |
| solar | `/solar` | `docs/reference/FHD/02-2.Solar (大).png` | `docs/fhd-witness/runs/<run-id>/playback/solar.png` | 1920x1080 | `<run-id>` | `<classification>` | `<notes>` | pending human review |
| factory-circuit | `/factory-circuit` | `docs/reference/FHD/03-3.Factory Circuit (大).png` | `docs/fhd-witness/runs/<run-id>/playback/factory-circuit.png` | 1920x1080 | `<run-id>` | `<classification>` | `<notes>` | pending human review |
| images | `/images` | `docs/reference/FHD/04-4.Images (大).png` | `docs/fhd-witness/runs/<run-id>/playback/images.png` | 1920x1080 | `<run-id>` | `<classification>` | `<notes>` | pending human review |
| sustainability | `/sustainability` | `docs/reference/FHD/05-5.Sustainability (大).png` | `docs/fhd-witness/runs/<run-id>/playback/sustainability.png` | 1920x1080 | `<run-id>` | `<classification>` | `<notes>` | pending human review |

## Editor Preview Rows

| route key | live route URL | current screenshot | viewport | purpose |
| --- | --- | --- | --- | --- |
| overview | `/display-pages/editor?page=overview` | `docs/fhd-witness/runs/<run-id>/editor/overview-editor.png` | 1920x1080 | Prove the closeout can be reviewed through the editor surface. |
| solar | `/display-pages/editor?page=solar` | `docs/fhd-witness/runs/<run-id>/editor/solar-editor.png` | 1920x1080 | Prove the closeout can be reviewed through the editor surface. |
| factory-circuit | `/display-pages/editor?page=factory-circuit` | `docs/fhd-witness/runs/<run-id>/editor/factory-circuit-editor.png` | 1920x1080 | Prove the closeout can be reviewed through the editor surface. |
| images | `/display-pages/editor?page=images` | `docs/fhd-witness/runs/<run-id>/editor/images-editor.png` | 1920x1080 | Prove the closeout can be reviewed through the editor surface. |
| sustainability | `/display-pages/editor?page=sustainability` | `docs/fhd-witness/runs/<run-id>/editor/sustainability-editor.png` | 1920x1080 | Prove the closeout can be reviewed through the editor surface. |

## Editor Capability Classification

- existing-editor-control: the gap can be resolved with an existing `/display-pages/editor` control. Name the control or region in the notes.
- new-editor-capability: the gap needs editor schema, inspector control, draft/live persistence, preview/runtime rendering, seed fallback, validation/reset, and targeted tests before final tuning.
- non-editor-runtime-gap: the gap belongs to product data, runtime behavior, asset governance, or another non-editor system change.
- intentional-difference: the user accepts the visible difference; record the reason and human acceptance status.

Unsupported editor gaps require editor capability work before page-local CSS-only tuning can be considered complete. Intentional differences and launch readiness require human acceptance after AI captures screenshots and reports unresolved gaps.
