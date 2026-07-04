# Design: Factory Circuit Visual Refinements & Playback Settings Overflow Fix

This document outlines the architectural decisions, database schemas, and front-end refinements required to achieve the improvements.

## 1. Seeding Guanyin Configuration JSON

To make sure that the Guanyin site rendering resolves all 8 load rows, the database seed registers the custom configuration override.

---

## 2. Dynamic SVG Connector Path & Height Fix

To resolve the clipping of the bottommost row (`ed_coating` Y=546.5), we will expand the height of the SVG viewport to `600px` (with viewBox `0 0 140 600`).

We will refine the path logic in `index.tsx` so the vertical bus line does not overshoot the topmost and bottommost branch junctions:
- The vertical bus line Y-coordinate start point is `minY + 16`.
- The vertical bus line Y-coordinate end point is `maxY - 16`.

---

## 3. High-Quality Inline SVG Flows

We will render all three lines connecting Solar, Inverter, and Board using inline vector `<svg>` elements:
- **Solar to Inverter**: horizontal line.
- **Inverter to Board**: horizontal line.
- **Inverter to Ground (Drop)**: a straight vertical line from top to bottom (Y=0 to Y=188), matching the user request to let it go straight to the bottom panel.

---

## 4. Contextual Load Row SVG Icons & Compact Typography

We will define an inline map `LOAD_ROW_SVG_ICONS` containing custom hand-crafted SVG elements for the 8 slots:
- `stamping`: Press machine icon.
- `body`: Car frame outline icon.
- `painting`: Spray nozzle icon.
- `assembly`: Interactive gears icon.
- `utility`: Bolt and wind turbine icon.
- `office`: Desktop monitor icon.
- `heavy_vehicle`: Bus/Truck profile icon.
- `ed_coating`: Electrophoresis bath ion tank icon.

### Preventing Name Overflow (Compact Layout)

When the load row height is compact (65px), we will use CSS rules to:
- Scale down the container height and padding.
- Decrease Chinese label size to `18px`, English subtitle size to `13px`.
- Reduce the vertical text gap to `2px` and icon bounding box size to `48px`.

---

## 5. Scrollable Rotation Order and Duration Cards

We will restrict Card 1 (`.ps-card-order`) and Card 2 (`.ps-card-duration`) content column heights inside `playbackSettings.css`:

```css
.playback-settings-page .ps-card-order .ps-card-content,
.playback-settings-page .ps-card-duration .ps-card-content {
  height: calc(100% - 78px);
  overflow-y: auto;
  padding-right: 8px;
}

/* Custom green webkit scrollbar */
.playback-settings-page .ps-card-order .ps-card-content::-webkit-scrollbar,
.playback-settings-page .ps-card-duration .ps-card-content::-webkit-scrollbar {
  width: 6px;
}
.playback-settings-page .ps-card-order .ps-card-content::-webkit-scrollbar-thumb,
.playback-settings-page .ps-card-duration .ps-card-content::-webkit-scrollbar-thumb {
  background: rgba(93, 119, 69, 0.22);
  border-radius: 3px;
}
```
