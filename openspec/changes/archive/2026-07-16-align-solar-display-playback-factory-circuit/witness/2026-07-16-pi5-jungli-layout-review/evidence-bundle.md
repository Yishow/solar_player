# FHD Witness Evidence Bundle - 2026-07-16-pi5-jungli-layout-review

- timestamp / run id: 2026-07-16-pi5-jungli-layout-review
- generated at: 2026-07-16T08:40:19.803Z
- viewport: 1920x1080
- base URL: http://100.99.99.2:3000
- human acceptance status: accepted by user on 2026-07-16

## Run Summary

- route key: factory-circuit
- live route URL: http://100.99.99.2:3000/factory-circuit?autoplay=0
- reference image: docs/reference/FHD/03-3.Factory Circuit (大).png
- current screenshots:
  - playback capture: openspec/changes/align-solar-display-playback-factory-circuit/witness/2026-07-16-pi5-jungli-layout-review/playback/factory-circuit.png
  - agent-browser capture: openspec/changes/align-solar-display-playback-factory-circuit/witness/2026-07-16-pi5-jungli-layout-review/playback/factory-circuit-agent-browser.png
- viewport: 1920x1080
- editor capability classification: existing-editor-control
- remaining gap notes: No automated contract gap remains. Live DOM has six 84px rows at Y=160/255/350/445/540/635, five 11px gaps, no overlap, endpoints centered at Y=202/297/392/487/582/677, routing source center Y=439.5, and the office row reads 事務系 / Office & Administration. Final visual acceptance remains human-owned.
- runtime evidence: release 0.1.0+bf88ea92a345-dirty, schema 24, service active, /health OK, migration 024 recorded, boot time unchanged at 2026-07-16 15:37:27.
- human acceptance status: accepted by user on 2026-07-16

## Playback Witnesses

| route key | live route URL | reference image | current screenshot | viewport | timestamp / run id | editor capability classification | remaining gap notes | human acceptance status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| overview | /overview | docs/reference/FHD/01-1.Overview (大).png | openspec/changes/align-solar-display-playback-factory-circuit/witness/2026-07-16-pi5-jungli-layout-review/playback/overview.png | 1920x1080 | 2026-07-16-pi5-jungli-layout-review | existing-editor-control | Batch capture only; outside this change and not reviewed for closeout. | pending human review |
| solar | /solar | docs/reference/FHD/02-2.Solar (大).png | openspec/changes/align-solar-display-playback-factory-circuit/witness/2026-07-16-pi5-jungli-layout-review/playback/solar.png | 1920x1080 | 2026-07-16-pi5-jungli-layout-review | existing-editor-control | Batch capture only; outside this change and not reviewed for closeout. | pending human review |
| factory-circuit | /factory-circuit | docs/reference/FHD/03-3.Factory Circuit (大).png | openspec/changes/align-solar-display-playback-factory-circuit/witness/2026-07-16-pi5-jungli-layout-review/playback/factory-circuit.png | 1920x1080 | 2026-07-16-pi5-jungli-layout-review | existing-editor-control | Six rows are evenly spaced with no overlap; every connector terminates at its row center; routing source center is within 0.5px of Y=440; office wording is correct. | accepted by user on 2026-07-16 |
| factory-circuit-guanyin | /factory-circuit-guanyin | docs/reference/FHD/03-3.Factory Circuit (大).png | openspec/changes/align-solar-display-playback-factory-circuit/witness/2026-07-16-pi5-jungli-layout-review/playback/factory-circuit-guanyin.png | 1920x1080 | 2026-07-16-pi5-jungli-layout-review | existing-editor-control | Batch capture only; Guanyin is explicitly outside this change. | pending human review |
| images | /images | docs/reference/FHD/04-4.Images (大).png | openspec/changes/align-solar-display-playback-factory-circuit/witness/2026-07-16-pi5-jungli-layout-review/playback/images.png | 1920x1080 | 2026-07-16-pi5-jungli-layout-review | existing-editor-control | Batch capture only; outside this change and not reviewed for closeout. | pending human review |
| sustainability | /sustainability | docs/reference/FHD/05-5.Sustainability (大).png | openspec/changes/align-solar-display-playback-factory-circuit/witness/2026-07-16-pi5-jungli-layout-review/playback/sustainability.png | 1920x1080 | 2026-07-16-pi5-jungli-layout-review | existing-editor-control | Batch capture only; outside this change and not reviewed for closeout. | pending human review |

## Editor Preview Witnesses

| route key | live route URL | current screenshot | purpose |
| --- | --- | --- | --- |
| overview | /display-pages/editor?page=overview | openspec/changes/align-solar-display-playback-factory-circuit/witness/2026-07-16-pi5-jungli-layout-review/editor/overview-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |
| solar | /display-pages/editor?page=solar | openspec/changes/align-solar-display-playback-factory-circuit/witness/2026-07-16-pi5-jungli-layout-review/editor/solar-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |
| factory-circuit | /display-pages/editor?page=factory-circuit | openspec/changes/align-solar-display-playback-factory-circuit/witness/2026-07-16-pi5-jungli-layout-review/editor/factory-circuit-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |
| factory-circuit-guanyin | /display-pages/editor?page=factory-circuit-guanyin | openspec/changes/align-solar-display-playback-factory-circuit/witness/2026-07-16-pi5-jungli-layout-review/editor/factory-circuit-guanyin-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |
| images | /display-pages/editor?page=images | openspec/changes/align-solar-display-playback-factory-circuit/witness/2026-07-16-pi5-jungli-layout-review/editor/images-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |
| sustainability | /display-pages/editor?page=sustainability | openspec/changes/align-solar-display-playback-factory-circuit/witness/2026-07-16-pi5-jungli-layout-review/editor/sustainability-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |

## Gap Classifications

- existing-editor-control: resolve with a current /display-pages/editor control.
- new-editor-capability: add editor schema, inspector, draft/live persistence, preview/runtime rendering, fallback, validation, and tests before final tuning.
- non-editor-runtime-gap: track as a product/system change outside editor capability.
- intentional-difference: requires explicit human acceptance before closeout.

Unsupported editor gaps are not complete as page-local CSS-only tuning.
