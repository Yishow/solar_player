## ADDED Requirements

### Requirement: Management render output unchanged after optimization

Memoization, card componentization, native lazy loading, and traversal folding applied to ImageManagement, SlideshowPreview, EnergyTrend, EnergyHistory, and AssetLibrary SHALL NOT change the rendered output. The post-change DOM structure, CSS class names, computed inline style values, text content, chart values, and chart curves SHALL match the pre-change output for equivalent state. AssetLibrary thumbnail `<img>` elements MAY add only `loading` and `decoding` attributes without other DOM changes.

#### Scenario: Same state produces same rendered output

- **WHEN** a management page renders for a given state before and after the change
- **THEN** the DOM structure, class names, style values, text content, and chart values/curves are identical, aside from added `loading`/`decoding` attributes on AssetLibrary thumbnails

### Requirement: Energy chart values unchanged after traversal folding

Folding the multiple snapshot traversals in EnergyTrend and EnergyHistory into a single pass SHALL NOT change the computed chart points, sums, or averages. For an identical snapshots/summaries input, every chart vector value and aggregate SHALL equal the pre-change result.

#### Scenario: Folded traversal yields identical chart vectors

- **WHEN** the Energy viewModel computes chart points, sums, and averages for a given snapshots input after the change
- **THEN** each computed value equals the value the pre-change multi-traversal implementation produced

##### Example: aggregate equivalence over a range

| Range  | Snapshots | Chart vectors / sums / averages |
| ------ | --------- | ------------------------------- |
| day    | small     | identical to pre-change         |
| year   | hundreds  | identical to pre-change         |

### Requirement: Management edit, save, and CRUD behavior preserved

The change SHALL preserve all existing management behavior. ImageManagement editing, saving, and draft dirty indication; SlideshowPreview rotation; EnergyTrend/EnergyHistory range switching; and AssetLibrary selection and category counts SHALL behave identically to the pre-change implementation.

#### Scenario: ImageManagement edit and save still work

- **WHEN** the user edits an asset field, observes the draft dirty indicator, and saves after the change
- **THEN** the dirty indicator and saved data match the pre-change behavior

#### Scenario: AssetLibrary selection and lazy thumbnails

- **WHEN** the asset library renders a large set of assets and the user selects one
- **THEN** selection and category counts behave as before, and thumbnails load lazily as they scroll into view while their final rendered appearance is unchanged

### Requirement: Existing management tests pass without modification

Existing management web tests SHALL pass without modification and serve as the invariance gate. A required edit to an existing assertion SHALL be treated as a signal of an unintended behavior or render change and SHALL halt the change for review.

#### Scenario: Management test suite stays green without editing assertions

- **WHEN** `pnpm --filter @solar-display/web test` runs after the change
- **THEN** the suite passes and no existing management assertion required editing to make it pass
