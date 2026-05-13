# 02-solar Binding Report

## Applied Bindings

- `solar-carport-mediaslot` -> `solar-carport-hero`
- `solar-panel-display` -> `solar-panel-display-source`
- `inverter-display` -> `inverter-display-source`
- `factory-consumption-display` -> `factory-consumption-display-source`
- `carbon-reduction-display` -> `carbon-reduction-display-source`
- `metric-generation-sun` -> `metric-generation-sun-source`
- `metric-self-consumption` -> `metric-self-consumption-source`
- `metric-co2-today` -> `carbon-reduction-display-source`
- `metric-co2-total` -> `metric-co2-total-source`
- `metric-efficiency` -> `metric-efficiency-source`

## Intentionally Unmapped

- `i-sun`
  - keep existing inline SVG because `page2` has no better weather-specific source icon
- `i-wifi`
  - keep existing inline SVG because `page2` has no network-status source icon
- `solar-leaf`
  - source ornament exists in `material-hints.json`, but this first pass does not rewrite decorative background divs into media slots
- `solar-gold`
  - source wave exists in `material-hints.json`, but this first pass keeps the existing decorative line implementation

## Notes

- The icon sheet in `ChatGPT Image 2026年5月11日 下午11_53_08 (2).png` is treated as a 4x3 grid.
- Raster icons are applied by preserving the existing outer `<svg>` shell and replacing inner symbol usage with `<image href="...">`.
- `metric-co2-today` currently reuses the same raster asset as `carbon-reduction-display` because the sheet does not contain a better dedicated CO2-today variant.
