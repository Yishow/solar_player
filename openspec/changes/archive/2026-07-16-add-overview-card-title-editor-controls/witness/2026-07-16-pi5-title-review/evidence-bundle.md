# FHD Witness Evidence Bundle - 2026-07-16-pi5-title-review

- timestamp / run id: 2026-07-16-pi5-title-review
- generated at: 2026-07-16T07:34:18.159Z
- viewport: 1920x1080
- base URL: http://100.99.99.2:3000
- human acceptance status: pending human review

## Playback Witnesses

| route key | live route URL | reference image | current screenshot | viewport | timestamp / run id | editor capability classification | remaining gap notes | human acceptance status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| overview | /overview | docs/reference/FHD/01-1.Overview (大).png | openspec/changes/archive/2026-07-16-add-overview-card-title-editor-controls/witness/2026-07-16-pi5-title-review/playback/overview.png | 1920x1080 | 2026-07-16-pi5-title-review | new-editor-capability | Pi5 playback renders all five KPI fallback titles without clipping. The selected `KPI power` inspector exposes the new `標題文字` field; focused tests cover override, persistence, and fallback. No live draft was changed or published during review. | pending human review |
| solar | /solar | docs/reference/FHD/02-2.Solar (大).png | openspec/changes/archive/2026-07-16-add-overview-card-title-editor-controls/witness/2026-07-16-pi5-title-review/playback/solar.png | 1920x1080 | 2026-07-16-pi5-title-review | intentional-difference | Captured by the batch witness but not evaluated by this Overview-only change. | pending human review |
| factory-circuit | /factory-circuit | docs/reference/FHD/03-3.Factory Circuit (大).png | openspec/changes/archive/2026-07-16-add-overview-card-title-editor-controls/witness/2026-07-16-pi5-title-review/playback/factory-circuit.png | 1920x1080 | 2026-07-16-pi5-title-review | intentional-difference | Captured by the batch witness but not evaluated by this Overview-only change. | pending human review |
| factory-circuit-guanyin | /factory-circuit-guanyin | docs/reference/FHD/03-3.Factory Circuit (大).png | openspec/changes/archive/2026-07-16-add-overview-card-title-editor-controls/witness/2026-07-16-pi5-title-review/playback/factory-circuit-guanyin.png | 1920x1080 | 2026-07-16-pi5-title-review | intentional-difference | Captured by the batch witness but not evaluated by this Overview-only change. | pending human review |
| images | /images | docs/reference/FHD/04-4.Images (大).png | openspec/changes/archive/2026-07-16-add-overview-card-title-editor-controls/witness/2026-07-16-pi5-title-review/playback/images.png | 1920x1080 | 2026-07-16-pi5-title-review | intentional-difference | Captured by the batch witness but not evaluated by this Overview-only change. | pending human review |
| sustainability | /sustainability | docs/reference/FHD/05-5.Sustainability (大).png | openspec/changes/archive/2026-07-16-add-overview-card-title-editor-controls/witness/2026-07-16-pi5-title-review/playback/sustainability.png | 1920x1080 | 2026-07-16-pi5-title-review | intentional-difference | Captured by the batch witness but not evaluated by this Overview-only change. | pending human review |

## Editor Preview Witnesses

| route key | live route URL | current screenshot | purpose |
| --- | --- | --- | --- |
| overview | /display-pages/editor?page=overview | openspec/changes/archive/2026-07-16-add-overview-card-title-editor-controls/witness/2026-07-16-pi5-title-review/editor/overview-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |
| overview selected KPI | /display-pages/editor?page=overview | openspec/changes/archive/2026-07-16-add-overview-card-title-editor-controls/witness/2026-07-16-pi5-title-review/editor/overview-kpi-title-inspector.png | Proves a selected Overview KPI exposes the `標題文字` inspector control on the deployed Pi5. |
| solar | /display-pages/editor?page=solar | openspec/changes/archive/2026-07-16-add-overview-card-title-editor-controls/witness/2026-07-16-pi5-title-review/editor/solar-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |
| factory-circuit | /display-pages/editor?page=factory-circuit | openspec/changes/archive/2026-07-16-add-overview-card-title-editor-controls/witness/2026-07-16-pi5-title-review/editor/factory-circuit-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |
| factory-circuit-guanyin | /display-pages/editor?page=factory-circuit-guanyin | openspec/changes/archive/2026-07-16-add-overview-card-title-editor-controls/witness/2026-07-16-pi5-title-review/editor/factory-circuit-guanyin-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |
| images | /display-pages/editor?page=images | openspec/changes/archive/2026-07-16-add-overview-card-title-editor-controls/witness/2026-07-16-pi5-title-review/editor/images-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |
| sustainability | /display-pages/editor?page=sustainability | openspec/changes/archive/2026-07-16-add-overview-card-title-editor-controls/witness/2026-07-16-pi5-title-review/editor/sustainability-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |

## Gap Classifications

- existing-editor-control: resolve with a current /display-pages/editor control.
- new-editor-capability: add editor schema, inspector, draft/live persistence, preview/runtime rendering, fallback, validation, and tests before final tuning.
- non-editor-runtime-gap: track as a product/system change outside editor capability.
- intentional-difference: requires explicit human acceptance before closeout.

Unsupported editor gaps are not complete as page-local CSS-only tuning.
