# Hero and Gallery Photo Generation Skill

Use this skill for display-page hero photos and gallery images.

## Inputs

Before generating, prepare:

- Manifest record draft
- Page recipe id
- Target route or preview surface
- Crop ratio and output size
- Composition notes
- QA owner or reviewer

## Default output

| Use | Format | Size |
| --- | --- | --- |
| Hero photo | `.webp` | 2400×1350 or 2880×1620 |
| Gallery photo | `.webp` | 2400×1350 |
| Thumbnail derivative | `.webp` | generated from approved source, not separately prompted |

## Generation workflow

1. Select shared recipe `shared.display-wall-style.v1`.
2. Select page recipe such as `solar.hero-photo.v1` or `images.gallery-photo.v1`.
3. Generate 4–8 candidates.
4. Reject candidates with baked text, brand-like marks, fake signage, distorted industrial details, overly dark lighting, or inconsistent color tone.
5. Pick 1–2 candidates for post-process.
6. Crop to target ratio.
7. Normalize color temperature, saturation, midtone brightness, and sharpness.
8. Export as `.webp`.
9. Place in preview route or managed asset slot.
10. Run preview QA before marking approved.

## Composition rules

- Hero photos must leave quiet space for text/fade overlays.
- Photos should not place high-contrast detail behind title, KPI, or card zones.
- Avoid hard edges that fight warm paper fade overlays.
- The main subject should be identifiable within three seconds.
- For Sustainability, prefer achievement/brand tone over real-time monitoring tone.
- For Images gallery, all photos in the set should share color grading and crop language.

## Failure cases

Reject or revise when:

- Text, signage artifacts, numbers, labels, or fake UI are visible.
- The photo becomes too dark under display shell overlays.
- The subject is too generic to communicate the page intent.
- The image only looks good standalone but fails in `/slideshow-preview`.
- The image color temperature clashes with other display pages.

## Approval evidence

Approved photo assets should have QA notes including:

- Route checked
- Slot checked
- Crop/fade result
- Readability result
- Any post-process applied
