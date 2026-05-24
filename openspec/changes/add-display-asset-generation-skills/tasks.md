## 1. Codex Agent Registration

- [x] 1.1 Add `.codex/agents/display_asset_guide.toml` with display asset generation instructions.
- [x] 1.2 Register `display_asset_guide` in `.codex/config.toml` alongside `frontend_guide`.
- [ ] 1.3 Review the agent instructions against the current display five-page runtime and prototype family.

## 2. Asset Skill Documentation

- [ ] 2.1 Add `docs/display-assets/README.md` describing manifest-first generation workflow.
- [ ] 2.2 Add `docs/display-assets/asset-manifest.template.md` with required fields and example records.
- [ ] 2.3 Add hero/gallery photo generation skill docs, including prompt structure, output specs, post-process rules, and failure cases.
- [ ] 2.4 Add icon generation skill docs, including SVG normalization, viewBox, stroke width, currentColor, and bitmap-to-SVG guidance.
- [ ] 2.5 Add ornament generation skill docs, including leaf/gold/branch ornament rules and token-driven color/opacity.
- [ ] 2.6 Add preview QA docs covering `/overview`, `/solar`, `/factory-circuit`, `/images`, `/sustainability`, and `/slideshow-preview`.

## 3. Prompt Recipes

- [ ] 3.1 Add shared style prompt recipe for the warm paper, green-energy, corporate display-wall visual family.
- [ ] 3.2 Add page-specific prompt recipes for Overview, Solar, FactoryCircuit, Images, and Sustainability.
- [ ] 3.3 Add negative prompt guidance for photos, icons, ornaments, and placeholders.
- [ ] 3.4 Add recipe examples for hero photo, gallery photo, KPI icon, flow node icon, circuit node icon, ESG icon, ornament, and placeholder.

## 4. Validation

- [ ] 4.1 Run `spectra validate --strict --changes add-display-asset-generation-skills`.
- [ ] 4.2 Manually review docs and agent instructions against latest `main` display page architecture and reference prototypes.
- [ ] 4.3 Confirm no production asset is marked `approved` without preview QA documentation.
