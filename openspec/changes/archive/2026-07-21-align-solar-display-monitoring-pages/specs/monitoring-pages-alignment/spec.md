## ADDED Requirements

### Requirement: Align the monitoring and maintenance routes as one read-heavy, runtime-sensitive batch

The implementation SHALL align `/trends`, `/history`, `/offline`, `/slideshow-preview`, and `/device-status` as one read-heavy, runtime-sensitive batch.

#### Scenario: The monitoring change starts

- **WHEN** this change begins
- **THEN** it only covers the monitoring and maintenance route family
- **AND** it keeps settings CRUD routes out of scope

##### Example:

- **GIVEN** `docs/reference/kuozui-green-fhd-html-prototype/html-pages/06-energy-trend-summary.html`, `docs/reference/kuozui-green-fhd-html-prototype/html-pages/11-energy-data-history.html`, `docs/reference/kuozui-green-fhd-html-prototype/html-pages/12-offline-error-display.html`, `docs/reference/kuozui-green-fhd-html-prototype/html-pages/13-slideshow-preview.html`, and `docs/reference/kuozui-green-fhd-html-prototype/html-pages/14-device-status-details.html` are the source pages
- **WHEN** this change is applied
- **THEN** those pages map only to `/trends`, `/history`, `/offline`, `/slideshow-preview`, and `/device-status`
- **AND** no settings route is included in the same change

### Requirement: Preserve offline, slideshow preview, and maintenance behavior

The implementation SHALL preserve reconnect, return navigation, preview controls, progress semantics, and maintenance-action feedback for the runtime-sensitive monitoring routes.

#### Scenario: Runtime-sensitive monitoring routes are exercised

- **WHEN** `/offline`, `/slideshow-preview`, or `/device-status` is used after visual alignment
- **THEN** the route keeps its existing behavior contract
- **AND** the visual migration does not reduce the route to a static mock page

##### Example:

- **GIVEN** `/offline` currently retries reconnection and `/slideshow-preview` currently controls preview playback
- **WHEN** the aligned routes are exercised
- **THEN** reconnect, return navigation, prev/next/play controls, and progress semantics remain active
- **AND** maintenance action feedback on `/device-status` remains visible

### Requirement: Keep monitoring and maintenance content readable at FHD scale

The implementation SHALL keep chart, table, status, and maintenance content readable at FHD scale.

#### Scenario: Long or dense content is rendered

- **WHEN** `/history`, `/device-status`, or other monitoring routes render dense content
- **THEN** the layout remains readable within the FHD canvas
- **AND** critical controls and status values remain visible

##### Example:

- **GIVEN** `/history` renders wide rows and `/device-status` renders dense system information
- **WHEN** the aligned routes are reviewed on the target FHD layout
- **THEN** the typography, spacing, wrapping, and overflow behavior remain usable
- **AND** operators can still locate important values and actions quickly
