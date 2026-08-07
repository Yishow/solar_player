# FHD Witness Evidence Bundle - relocate-display-runtime-sync-status-20260808

- timestamp / run id: relocate-display-runtime-sync-status-20260808
- generated at: 2026-08-07T16:11:42.284Z
- viewport: 1920x1080
- base URL: http://localhost:4173
- capture command: `pnpm run fhd:witness -- --base-url http://localhost:4173 --run-id relocate-display-runtime-sync-status-20260808`
- pairing: fresh one-time CL/KN pairing URLs issued by the local API; Chromium run with required macOS permission
- human acceptance status: pending human review

## Playback Witnesses

| route key | live route URL | reference image | current screenshot | viewport | timestamp / run id | editor capability classification | remaining gap notes | human acceptance status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| overview | /overview | docs/reference/FHD/01-1.Overview (大).png | docs/fhd-witness/runs/relocate-display-runtime-sync-status-20260808/playback/overview.png | 1920x1080 | relocate-display-runtime-sync-status-20260808 | non-editor-runtime-gap | Runtime sync overlay absent as required by this change; visual comparison remains for human acceptance. | pending human review |
| solar | /solar | docs/reference/FHD/02-2.Solar (大).png | docs/fhd-witness/runs/relocate-display-runtime-sync-status-20260808/playback/solar.png | 1920x1080 | relocate-display-runtime-sync-status-20260808 | non-editor-runtime-gap | Runtime sync overlay absent as required by this change; visual comparison remains for human acceptance. | pending human review |
| factory-circuit | /factory-circuit | docs/reference/FHD/03-3.Factory Circuit (大).png | docs/fhd-witness/runs/relocate-display-runtime-sync-status-20260808/playback/factory-circuit.png | 1920x1080 | relocate-display-runtime-sync-status-20260808 | non-editor-runtime-gap | Runtime sync overlay absent as required by this change; visual comparison remains for human acceptance. | pending human review |
| factory-circuit-guanyin | /factory-circuit-guanyin | docs/reference/FHD/03-3.Factory Circuit (大).png | docs/fhd-witness/runs/relocate-display-runtime-sync-status-20260808/playback/factory-circuit-guanyin.png | 1920x1080 | relocate-display-runtime-sync-status-20260808 | non-editor-runtime-gap | Runtime sync overlay absent as required by this change; visual comparison remains for human acceptance. | pending human review |
| images | /images | docs/reference/FHD/04-4.Images (大).png | docs/fhd-witness/runs/relocate-display-runtime-sync-status-20260808/playback/images.png | 1920x1080 | relocate-display-runtime-sync-status-20260808 | non-editor-runtime-gap | Runtime sync overlay absent as required by this change; visual comparison remains for human acceptance. | pending human review |
| sustainability | /sustainability | docs/reference/FHD/05-5.Sustainability (大).png | docs/fhd-witness/runs/relocate-display-runtime-sync-status-20260808/playback/sustainability.png | 1920x1080 | relocate-display-runtime-sync-status-20260808 | non-editor-runtime-gap | Runtime sync overlay absent as required by this change; visual comparison remains for human acceptance. | pending human review |

## Editor Preview Witnesses

| route key | live route URL | current screenshot | purpose |
| --- | --- | --- | --- |
| overview | /display-pages/editor?page=overview | docs/fhd-witness/runs/relocate-display-runtime-sync-status-20260808/editor/overview-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |
| solar | /display-pages/editor?page=solar | docs/fhd-witness/runs/relocate-display-runtime-sync-status-20260808/editor/solar-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |
| factory-circuit | /display-pages/editor?page=factory-circuit | docs/fhd-witness/runs/relocate-display-runtime-sync-status-20260808/editor/factory-circuit-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |
| factory-circuit-guanyin | /display-pages/editor?page=factory-circuit-guanyin | docs/fhd-witness/runs/relocate-display-runtime-sync-status-20260808/editor/factory-circuit-guanyin-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |
| images | /display-pages/editor?page=images | docs/fhd-witness/runs/relocate-display-runtime-sync-status-20260808/editor/images-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |
| sustainability | /display-pages/editor?page=sustainability | docs/fhd-witness/runs/relocate-display-runtime-sync-status-20260808/editor/sustainability-editor.png | Proves the corresponding page can be reviewed from /display-pages/editor. |

## Site Context Witnesses

| site | route key | live route URL | current screenshot | purpose |
| --- | --- | --- | --- | --- |
| kn | overview | /overview | docs/fhd-witness/runs/relocate-display-runtime-sync-status-20260808/playback/site-context/kn-overview.png | Proves the shared Site-sensitive page under the paired KN Device context. |
| kn | solar | /solar | docs/fhd-witness/runs/relocate-display-runtime-sync-status-20260808/playback/site-context/kn-solar.png | Proves the shared Site-sensitive page under the paired KN Device context. |
| kn | sustainability | /sustainability | docs/fhd-witness/runs/relocate-display-runtime-sync-status-20260808/playback/site-context/kn-sustainability.png | Proves the shared Site-sensitive page under the paired KN Device context. |

## Debug result

The first attempt failed before browser capture because pairing URLs were not supplied. The sandboxed Chromium attempt then failed at macOS Mach-port permission. With fresh one-time pairing URLs and escalated Chromium permission, the exact witness workflow completed and wrote all expected playback/editor/site-context screenshots. No second-change product-code fix was indicated by the successful rerun.
