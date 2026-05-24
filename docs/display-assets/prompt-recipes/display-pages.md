# Display Page Asset Recipes

All recipes extend `shared.display-wall-style.v1`.

## Overview

### `overview.hero-photo.v1`

- Role: hero photo
- Output: `.webp`, `2400x1350` or `2880x1620`
- Intent: broad corporate sustainability opening scene
- Composition: clean factory campus or green-energy site, warm daylight, calm left-side space for copy/fade, right-side visual interest

### `overview.kpi-icon.v1`

- Role: KPI icon
- Output: `.svg`, `viewBox 0 0 96 96`
- Intent: real-time power, today generation, total generation, today CO2 reduction, total CO2 reduction

## Solar

### `solar.hero-photo.v1`

- Role: hero photo
- Output: `.webp`, `2400x1350` or `2880x1620`
- Intent: solar carport or solar panel installation as the solar energy anchor
- Composition: panels with clean industrial context, warm light, quiet region for title and fade overlay

### `solar.flow-icon.v1`

- Role: flow node icon
- Output: `.svg`, `viewBox 0 0 128 128`
- Intent: solar panel, inverter, factory consumption, CO2 reduction

### `solar.kpi-icon.v1`

- Role: KPI icon
- Output: `.svg`, `viewBox 0 0 96 96`
- Intent: generation, self-consumption, CO2 today, CO2 total, efficiency

## FactoryCircuit

### `factory-circuit.node-icon.v1`

- Role: circuit node icon
- Output: `.svg`, `viewBox 0 0 128 128`
- Intent: source, inverter, switchboard, factory load, endpoint
- Rule: preserve electrical topology readability

### `factory-circuit.load-icon.v1`

- Role: load row icon
- Output: `.svg`, `viewBox 0 0 96 96`
- Intent: equipment, lighting, HVAC, production, load rows

## Images

### `images.gallery-photo.v1`

- Role: gallery photo
- Output: `.webp`, `2400x1350`
- Intent: curated factory, solar, equipment, ESG, or site scenes
- Rule: all photos in the set share color temperature, crop behavior, and thumbnail readability

### `images.placeholder.v1`

- Role: placeholder
- Output: `.svg`
- Intent: quiet fallback for missing gallery assets

## Sustainability

### `sustainability.hero-photo.v1`

- Role: hero photo
- Output: `.webp`, `2400x1350` or `2880x1620`
- Intent: green factory or ESG achievement scene
- Composition: brand achievement tone, warm and calm, compatible with fade overlays

### `sustainability.kpi-icon.v1`

- Role: KPI icon
- Output: `.svg`, `viewBox 0 0 96 96`
- Intent: energy, CO2, trees, renewable energy, efficiency, supply chain

### `sustainability.esg-icon.v1`

- Role: ESG icon
- Output: `.svg`, `viewBox 0 0 96 96`
- Intent: renewable energy, energy saving, supply chain, corporate responsibility
