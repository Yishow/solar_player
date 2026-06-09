## ADDED Requirements

### Requirement: Overview generation trend widget renders a full data-visualisation chart

The Overview generation trend widget SHALL render its runtime trend series as a full data-visualisation chart that fills the trend card plot area, matching the Better reference sample. The chart SHALL include: a smooth filled area curve (a smoothed path rather than angular straight segments) with a layered gradient fill; a vertical (value) axis with at least two scale labels and corresponding horizontal gridlines; horizontal (time) axis labels; per-sample data points; and a marked peak. The widget SHALL preserve the existing runtime-only data rule: it SHALL render only from runtime-provided trend data and SHALL render an empty state when no runtime trend data is available.

#### Scenario: Trend widget renders a smooth filled chart for runtime series

- **WHEN** the Overview generation trend widget is enabled and the view model provides a non-empty trend series
- **THEN** the widget renders a smoothed curve with a gradient-filled area that fills the card plot area

##### Example: Runtime series fills the plot area

- **GIVEN** the Overview view model exposes trend series `[0.2, 0.9, 2.6, 4.8, 3.7, 1.4]`
- **WHEN** the generation trend widget renders
- **THEN** the chart shows a smooth filled curve spanning the full plot width
- **AND** the filled area reaches down to the chart baseline rather than rendering as a thin sparkline only

#### Scenario: Trend widget shows value-axis scale and gridlines

- **WHEN** the Overview generation trend widget renders a non-empty runtime trend series
- **THEN** the widget displays at least two value-axis scale labels with corresponding horizontal gridlines, where the top scale label is greater than or equal to the series peak

##### Example: Nice max encloses the peak

- **GIVEN** the runtime series peak is `4.8 kW`
- **WHEN** the chart computes its Y-axis scale
- **THEN** the top tick label is a nice rounded value greater than or equal to `4.8`
- **AND** each rendered tick has a matching horizontal gridline

#### Scenario: Trend widget shows time-axis labels, data points, and peak

- **WHEN** the Overview generation trend widget renders a non-empty runtime trend series
- **THEN** the widget displays time-axis labels along the horizontal axis, a data point per sample, and a marker on the peak value

##### Example: Peak sample is annotated

- **GIVEN** the runtime series covers `06:00`, `09:00`, `12:00`, `15:00`, and `18:00`
- **WHEN** the generation trend widget renders the series
- **THEN** the X-axis shows time labels for the day
- **AND** each sample is drawn with a point marker
- **AND** the `12:00` peak sample renders a distinct peak marker

#### Scenario: Trend widget shows empty state without runtime data

- **WHEN** the Overview generation trend widget is enabled and the view model provides no trend series
- **THEN** the widget renders its empty state rather than a chart

##### Example: No data keeps the widget in empty state

- **GIVEN** the widget is visible but the Overview view model exposes `trendSeries: []`
- **WHEN** the generation trend widget renders
- **THEN** no SVG chart is shown
- **AND** the widget presents its empty-state copy instead

#### Scenario: Shared sparkline default unchanged for other callers

- **WHEN** another surface uses the shared sparkline primitive without enabling the smooth option
- **THEN** that sparkline renders with its existing straight-segment path

##### Example: KPI sparkline caller keeps angular path

- **GIVEN** another Overview KPI footer still renders `Sparkline` without `smooth: true`
- **WHEN** that footer renders its trend line
- **THEN** the path remains the existing straight-segment sparkline
- **AND** the full chart treatment stays scoped to the generation trend widget
