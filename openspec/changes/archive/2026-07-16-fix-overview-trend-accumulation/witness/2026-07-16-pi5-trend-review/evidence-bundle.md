# FHD Witness Evidence Bundle - 2026-07-16-pi5-trend-review

- timestamp / run id: 2026-07-16-pi5-trend-review
- generated at: 2026-07-16T07:37:55Z
- viewport: 1920x1080
- base URL: http://100.99.99.2:3000
- human acceptance status: pending human review

## Playback Witnesses

| route key | live route URL | reference image | current screenshot | viewport | timestamp / run id | editor capability classification | remaining gap notes | human acceptance status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| overview | /overview | docs/reference/FHD/01-1.Overview (大).png | openspec/changes/archive/2026-07-16-fix-overview-trend-accumulation/witness/2026-07-16-pi5-trend-review/playback/overview.png | 1920x1080 | 2026-07-16-pi5-trend-review | non-editor-runtime-gap | Pi5 playback visibly restores the generation trend and persisted monthly series after deployment. The monthly series is flat because current persisted July consumption totals are zero; focused service tests cover positive same-day accumulation and restart continuation. | pending human review |
| solar | /solar | docs/reference/FHD/02-2.Solar (大).png | openspec/changes/archive/2026-07-16-fix-overview-trend-accumulation/witness/2026-07-16-pi5-trend-review/playback/solar.png | 1920x1080 | 2026-07-16-pi5-trend-review | intentional-difference | Captured by the batch witness but not evaluated by this Overview-only change. | pending human review |
| factory-circuit | /factory-circuit | docs/reference/FHD/03-3.Factory Circuit (大).png | openspec/changes/archive/2026-07-16-fix-overview-trend-accumulation/witness/2026-07-16-pi5-trend-review/playback/factory-circuit.png | 1920x1080 | 2026-07-16-pi5-trend-review | intentional-difference | Captured by the batch witness but not evaluated by this Overview-only change. | pending human review |
| factory-circuit-guanyin | /factory-circuit-guanyin | docs/reference/FHD/03-3.Factory Circuit (大).png | openspec/changes/archive/2026-07-16-fix-overview-trend-accumulation/witness/2026-07-16-pi5-trend-review/playback/factory-circuit-guanyin.png | 1920x1080 | 2026-07-16-pi5-trend-review | intentional-difference | Captured by the batch witness but not evaluated by this Overview-only change. | pending human review |
| images | /images | docs/reference/FHD/04-4.Images (大).png | openspec/changes/archive/2026-07-16-fix-overview-trend-accumulation/witness/2026-07-16-pi5-trend-review/playback/images.png | 1920x1080 | 2026-07-16-pi5-trend-review | intentional-difference | Captured by the batch witness but not evaluated by this Overview-only change. | pending human review |
| sustainability | /sustainability | docs/reference/FHD/05-5.Sustainability (大).png | openspec/changes/archive/2026-07-16-fix-overview-trend-accumulation/witness/2026-07-16-pi5-trend-review/playback/sustainability.png | 1920x1080 | 2026-07-16-pi5-trend-review | intentional-difference | Captured by the batch witness but not evaluated by this Overview-only change. | pending human review |

## Editor Preview Witnesses

| route key | live route URL | current screenshot | purpose |
| --- | --- | --- | --- |
| overview | /display-pages/editor?page=overview | openspec/changes/archive/2026-07-16-fix-overview-trend-accumulation/witness/2026-07-16-pi5-trend-review/editor/overview-editor.png | Proves the deployed Overview can be reviewed from /display-pages/editor. |
| solar | /display-pages/editor?page=solar | openspec/changes/archive/2026-07-16-fix-overview-trend-accumulation/witness/2026-07-16-pi5-trend-review/editor/solar-editor.png | Batch witness only; outside this change. |
| factory-circuit | /display-pages/editor?page=factory-circuit | openspec/changes/archive/2026-07-16-fix-overview-trend-accumulation/witness/2026-07-16-pi5-trend-review/editor/factory-circuit-editor.png | Batch witness only; outside this change. |
| factory-circuit-guanyin | /display-pages/editor?page=factory-circuit-guanyin | openspec/changes/archive/2026-07-16-fix-overview-trend-accumulation/witness/2026-07-16-pi5-trend-review/editor/factory-circuit-guanyin-editor.png | Batch witness only; outside this change. |
| images | /display-pages/editor?page=images | openspec/changes/archive/2026-07-16-fix-overview-trend-accumulation/witness/2026-07-16-pi5-trend-review/editor/images-editor.png | Batch witness only; outside this change. |
| sustainability | /display-pages/editor?page=sustainability | openspec/changes/archive/2026-07-16-fix-overview-trend-accumulation/witness/2026-07-16-pi5-trend-review/editor/sustainability-editor.png | Batch witness only; outside this change. |

## Runtime Verification Notes

- The Pi5 witness shows a non-empty generation trend with a current value of `2,823 kW`.
- The monthly consumption widget renders persisted July dates after restart. Its current values remain `0 kWh`, matching the stored rows instead of inventing positive data.
- Focused tests verify positive accumulation, persistence, and restart continuation independently of the current MQTT feed.
- Final visual acceptance remains a human decision.
