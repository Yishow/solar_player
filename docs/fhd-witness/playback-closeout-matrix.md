# FHD Playback Closeout Matrix

This matrix is the active route/reference input for AI-led FHD witness capture. The capture command is:

```bash
pnpm run fhd:witness -- --base-url http://localhost:5173
```

Use `--run-id <id>` when a deterministic evidence folder is needed.

| page | route key | live route URL | reference image | playback screenshot output | editor preview URL |
| --- | --- | --- | --- | --- | --- |
| Overview | overview | `/overview` | `docs/reference/FHD/01-1.Overview (大).png` | `playback/overview.png` | `/display-pages/editor?page=overview` |
| Solar | solar | `/solar` | `docs/reference/FHD/02-2.Solar (大).png` | `playback/solar.png` | `/display-pages/editor?page=solar` |
| FactoryCircuit | factory-circuit | `/factory-circuit` | `docs/reference/FHD/03-3.Factory Circuit (大).png` | `playback/factory-circuit.png` | `/display-pages/editor?page=factory-circuit` |
| Images | images | `/images` | `docs/reference/FHD/04-4.Images (大).png` | `playback/images.png` | `/display-pages/editor?page=images` |
| Sustainability | sustainability | `/sustainability` | `docs/reference/FHD/05-5.Sustainability (大).png` | `playback/sustainability.png` | `/display-pages/editor?page=sustainability` |

## Reference-Informed Boundary Map

Use the reference-informed closeout boundary rules to classify the follow-up after each witness capture. The capture output does not decide launch readiness; it supplies evidence for the boundary decision.

The latest reference-informed witness batch (run id `reference-informed-closeout`) is classified per page in the boundary classification artifact, which carries the DOM-measured `reference-quality-target` and `actual-gap` rows consumed by the four page closeout changes.

| page | protected product choice example | reference quality target examples | actual gap examples |
| --- | --- | --- | --- |
| Overview | `protected-product-choice`: accepted shared header height and position. | `reference-quality-target`: hero photo fade, bilingual title rhythm, KPI row spacing. | `actual-gap`: missing fresh runtime/publish/fallback witness. |
| Solar | `protected-product-choice`: accepted shared footer height and nav position. | `reference-quality-target`: connector thickness, flow node placement, source-like flow language, KPI row rhythm. | `actual-gap`: connector treatment only if existing editor controls cannot express witness needs. |
| FactoryCircuit | `protected-product-choice`: accepted shared shell information density. | `reference-quality-target`: circuit line weight, ornament balance, load panel display hierarchy. | `actual-gap`: connector stroke or load-row rhythm capability only if witness proves current controls insufficient. |
| Images | `protected-product-choice`: accepted shared header/footer position. | `reference-quality-target`: media stage crop, thumbnail strip density, caption display tension. | `actual-gap`: runtime playlist/fallback witness or production image-set governance. |
| Sustainability | `protected-product-choice`: accepted shared footer position. | `reference-quality-target`: ring ornament integration, hero media overlap, tree/stat rhythm, highlight rail density. | `actual-gap`: ring/media treatment or hero media effects capability only if witness proves current controls insufficient. |

Generated runs are written under `docs/fhd-witness/runs/<run-id>/`:

- `playback/*.png` records the live playback route witness.
- `editor/*-editor.png` records the matching `/display-pages/editor` preview state.
- `evidence-bundle.md` records route/reference/screenshot pairings and follow-up classification.

Generated runs are local evidence artifacts and are ignored by git; copy the relevant paths into the Spectra handoff or review summary when closing a change.

The witness command captures evidence only. It does not make pixel thresholds a CI gate, and it does not decide launch readiness. AI owns capture, evidence collation, Spectra task hygiene, and unresolved-gap reporting. Human review owns product intent, intentional differences, and final launch acceptance.

## Closeout Status

| page | closeout change | config-level result | fresh recapture |
| --- | --- | --- | --- |
| Overview | `polish-overview-solar-reference-quality-targets` (2026-06-06) | hero fade 放寬、KPI padding/value 微增（editor-backed）。actual-gap：無 | 延 Phase 2 batch（`overview.png` 待重截） |
| Solar | `polish-overview-solar-reference-quality-targets` (2026-06-06) | connector 加粗、KPI 等寬（editor-backed）。actual-gap：node/connector 飽和、gold/leaf 基底、hero framing | 延 Phase 2 batch（`solar.png` 待重截） |
| FactoryCircuit | `polish-factory-circuit-reference-quality-targets` (2026-06-06) | 無 editor-backed 值可調；actual-gap：電路線寬（PNG）、node 飽和、CSS 字級、leaf binding | 延 Phase 2 batch（`factory-circuit.png` 待重截） |
| Images | `polish-images-reference-quality-targets` (2026-06-06) | media stage 放大、info panel 加寬、caption 字級加大（editor-backed）。4-up thumbnail BLOCKED（需 Phase 3 seed） | 延 Phase 2 batch（`images.png` 待重截，4-up 待補資料） |
| Sustainability | `polish-sustainability-reference-quality-targets` (2026-06-06) | ring glow 收斂 0.24→0.16（editor-backed）。actual-gap：hero 飽和/palette、copy-en 字級、stat padding、leaf rotation | 延 Phase 2 batch（`sustainability.png` 待重截） |

Closeout 詳情記錄於各 change 的 reference-quality closeout 文件。視覺改善不改 launch status（launch witness matrix 維持 `blocked`）。
