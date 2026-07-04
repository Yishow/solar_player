# Proposal: Factory Circuit Visual Refinements & Playback Settings Overflow Fix

This change addresses a set of visual and layout improvements for the Jungli & Guanyin Factory Circuit pages, as well as fixing a scroll container issue in the Playback Settings page.

## Problem Statement

1. **Guanyin Site Registry Configuration Gap**: The Guanyin site page registry instance (`factory-circuit-guanyin`) was seeded without explicit configurations, causing it to fall back to the default Jungli configuration (which sets `heavy_vehicle` and `ed_coating` rows to `visible: false`), resulting in only 6 rows displaying.
2. **SVG Connector Overhangs**: The dynamic SVG routing path vertical bus line extends too far (by 16px) beyond the upper and lower branch start points, creating ugly vertical "hangers" that ruin FHD pixel-alignment.
3. **Low-Quality Raster Line Connectors**: The three lines connecting Solar Panels, Inverters, and Switchboards currently load low-resolution `.png` images, which look blurry on FHD screens and lack a conceptual linkage to the active power flow.
4. **Playback Settings Page Overflow**: The rotation sequence list under Card 1 ("Rotation Order") overflowed the bottom-card container when pages expanded, causing list elements to spill outside the card border due to `overflow: visible`.

## Proposed Solution

1. **Explicit Seeding of Guanyin Config**: Update the seeder database script to explicitly insert custom `config_json` entries for `factory-circuit-guanyin` in both `display_page_configs` and `display_page_stage_configs` (for both `draft` and `live` stages), forcing all 8 load rows to be `visible: true` and layout to use the Guanyin compact coordinate array.
2. **Strict Boundary Calculations for Vertical Bus**: Correct the Y boundary math in `index.tsx` so the vertical bus line starts precisely at `minY + 16` and ends at `maxY - 16`, eliminating the extra overhangs.
3. **Inline SVG glow/flow line Connectors**: Replace the raster PNG connector images with sharp, responsive inline SVGs matching the main line styles, and add a subtle glowing dashboard flow animation to all active line segments.
4. **Card 1 Scroll Container**: Implement a stylish scroll container with customized green scrollbars for the Rotation Order content column (`.ps-card-content` nested inside `.ps-card-order`), clamping height and enabling scroll.
