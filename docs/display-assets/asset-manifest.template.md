# Display Asset Manifest Template

Use this template before generating, exporting, or approving display page assets.

## Record fields

| Field | Required | Description |
| --- | --- | --- |
| `page` | yes | `overview`, `solar`, `factory-circuit`, `images`, `sustainability`, or `shared`. |
| `slot` | yes | Runtime or visual slot, such as `heroMedia`, `gallery`, `kpiIcon`, `flowNodeIcon`, `circuitNodeIcon`, `ornament`, `placeholder`. |
| `assetKey` | yes | Stable kebab-case key. |
| `role` | yes | `photo`, `icon`, `ornament`, or `placeholder`. |
| `format` | yes | `webp`, `svg`, or justified exception. |
| `targetSize` | yes | Pixel or viewBox target, such as `2400x1350`, `96x96`, `viewBox 0 0 96 96`. |
| `sourceMode` | yes | `seed-default`, `managed-asset`, or `direct-src`. |
| `promptRecipe` | yes | Recipe id used to generate or prepare the asset. |
| `version` | yes | Start with `v001`. Increment for meaningful visual revisions. |
| `status` | yes | `draft`, `candidate`, `approved`, or `deprecated`. |
| `qaNotes` | yes before approval | Preview QA result and review notes. |

## YAML example

```yaml
- page: solar
  slot: heroMedia
  assetKey: solar-carport
  role: photo
  format: webp
  targetSize: 2400x1350
  sourceMode: seed-default
  promptRecipe: solar.hero-photo.v1
  version: v001
  status: candidate
  qaNotes: "Pending /solar and /slideshow-preview review."

- page: solar
  slot: flowNodeIcon
  assetKey: solar-flow-panel
  role: icon
  format: svg
  targetSize: viewBox 0 0 128 128
  sourceMode: seed-default
  promptRecipe: solar.flow-icon.v1
  version: v001
  status: candidate
  qaNotes: "Needs SVG normalization to currentColor before approval."
```

## Approval checklist

An asset may be marked `approved` only when:

- It has a complete manifest record.
- It follows the correct prompt recipe or documented source path.
- It has been exported to the required format/size.
- It has passed page-level preview QA.
- It does not bake display text, numbers, labels, logos, or UI states into a bitmap.
- Its final path follows the naming convention.
