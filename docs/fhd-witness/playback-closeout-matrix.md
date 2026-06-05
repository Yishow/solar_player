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

Generated runs are written under `docs/fhd-witness/runs/<run-id>/`:

- `playback/*.png` records the live playback route witness.
- `editor/*-editor.png` records the matching `/display-pages/editor` preview state.
- `evidence-bundle.md` records route/reference/screenshot pairings and follow-up classification.

Generated runs are local evidence artifacts and are ignored by git; copy the relevant paths into the Spectra handoff or review summary when closing a change.

The witness command captures evidence only. It does not make pixel thresholds a CI gate, and it does not decide launch readiness. AI owns capture, evidence collation, Spectra task hygiene, and unresolved-gap reporting. Human review owns product intent, intentional differences, and final launch acceptance.
