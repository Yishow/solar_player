# Display Page Prompt Recipes

All recipes extend `shared.display-wall-style.v1`.

## Overview

### `overview.hero-photo.v1`

**Intent:** A broad corporate sustainability opening scene for the display wall.

**Composition:** Clean factory campus, renewable-energy context, warm daylight, calm left-side or foreground negative space for hero copy, right-side visual interest, suitable for soft fade into ivory background.

**Output:** `webp`, 2400×1350 or 2880×1620.

**Avoid:** Busy signage, visible text, close-up people, license plates, harsh shadows, strong blue cast, and objects that obscure KPI cards.

### `overview.kpi-icon.v1`

**Intent:** Power, daily generation, total generation, daily CO2 reduction, total CO2 reduction.

**Output:** SVG, 96×96 viewBox, consistent stroke rhythm, `currentColor`.

## Solar

### `solar.hero-photo.v1`

**Intent:** Solar carport or solar panel installation as the visual anchor for solar energy generation.

**Composition:** Solar panels with factory or clean industrial context, warm natural light, enough quiet region for the page title and fade overlay, no baked text.

**Output:** `webp`, 2400×1350 or 2880×1620.

### `solar.flow-icon.v1`

**Intent:** Solar panel, inverter, factory consumption, and CO2 reduction flow nodes.

**Output:** SVG, 128×128 viewBox, one icon grammar for the full flow set, readable at display distance.

### `solar.kpi-icon.v1`

**Intent:** Today generation, self-consumption, CO2 today, CO2 total, and system efficiency.

**Output:** SVG, 96×96 viewBox, consistent with flow icons but simpler.

## FactoryCircuit

### `factory-circuit.node-icon.v1`

**Intent:** Electrical circuit nodes such as source, inverter, switchboard, factory load, and status endpoints.

**Output:** SVG, 128×128 viewBox, strong semantic readability, `currentColor`.

**Guidance:** The icon should support electrical topology readability. Do not create decorative images that weaken routing meaning.

### `factory-circuit.load-icon.v1`

**Intent:** Equipment, lighting, HVAC, production, and other load rows.

**Output:** SVG, 96×96 viewBox, compact and clear in rows.

### `factory-circuit.routing-ornament.v1`

**Intent:** Endpoint markers or subtle route helpers if needed.

**Output:** SVG/CSS primitive only. Routing lines themselves should remain rendered by React/SVG/CSS, not as bitmap assets.

## Images

### `images.gallery-photo.v1`

**Intent:** A curated set of real-photo-like gallery images showing factory, solar, equipment, ESG, or site scenes.

**Composition:** Consistent color temperature and crop behavior across the set. Each image must work as both main stage and thumbnail.

**Output:** `webp`, 2400×1350.

**Avoid:** Mixed visual eras, inconsistent color grading, excessive contrast, busy signs, and details that become unreadable in thumbnails.

### `images.placeholder.v1`

**Intent:** Quiet fallback for missing gallery assets.

**Output:** SVG, simple glyph/surface, token-friendly color.

## Sustainability

### `sustainability.hero-photo.v1`

**Intent:** A corporate ESG achievement scene with clean factory, greenery, solar/energy implication, or sustainability progress mood.

**Composition:** More brand-achievement oriented than real-time monitoring. Warm, calm, premium, and compatible with hero fade overlays.

**Output:** `webp`, 2400×1350 or 2880×1620.

### `sustainability.kpi-icon.v1`

**Intent:** Energy, CO2, trees, renewable energy, efficiency, and supply chain.

**Output:** SVG, 96×96 viewBox, calm ESG tone, not playful or cartoon-like.

### `sustainability.esg-icon.v1`

**Intent:** ESG action list icons for renewable energy, energy saving, supply chain, and corporate responsibility.

**Output:** SVG, 96×96 viewBox, `currentColor`, suitable for compact achievement cards.
