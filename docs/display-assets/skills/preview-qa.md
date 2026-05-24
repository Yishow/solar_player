# Preview QA Skill

Use this checklist before marking generated assets as `approved`.

## Routes to review

Review the relevant route and the slideshow preview when the asset appears in rotation:

- `/overview`
- `/solar`
- `/factory-circuit`
- `/images`
- `/sustainability`
- `/slideshow-preview`

## General checks

- The page topic is understandable within three seconds.
- The asset supports the page story rather than becoming the story by accident.
- Text and metric readability remain strong.
- No important visual detail sits behind title, KPI, route lines, or cards.
- The asset matches the warm paper / green-energy display family.
- The asset does not introduce a new visual language.
- The asset still works when seen as a small slideshow preview card.

## Photo checks

- The photo blends with the page fade/mask.
- The crop works at the target FHD placement.
- The subject is not too busy for a display wall.
- The color tone matches other display pages.
- No baked-in text, fake signage, brand-like marks, or UI details are visible.

## Icon checks

- Icons in the same set share line weight and detail density.
- Icons remain readable in KPI cards, flow nodes, circuit nodes, and preview miniatures.
- Final SVG uses `currentColor` or documented token-compatible color behavior.
- Icon semantics are clear without nearby explanatory text.

## Ornament checks

- Ornament is visible enough to add depth but quiet enough to stay behind content.
- Ornament color and opacity follow display semantic tokens or chrome config.
- Ornament does not create clutter in slideshow preview cards.

## Approval note template

```text
QA route(s):
Slot:
Asset key/version:
Readability:
Fade/crop:
Icon/ornament consistency:
Slideshow preview:
Decision: approved | revise | deprecated
Notes:
```

## Approval rule

Only set `status: approved` when the asset has passed route-level preview QA and the manifest record includes QA notes.
