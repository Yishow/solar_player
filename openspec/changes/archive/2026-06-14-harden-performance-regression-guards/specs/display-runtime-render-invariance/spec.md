## ADDED Requirements

### Requirement: Staged loading preserves playback hook order

Performance refactors that introduce or move staged loading returns in playback runtime pages SHALL preserve React hook call order. A playback runtime page that can return the shared display page loading state SHALL NOT call React hooks after that loading return path and before its main JSX return.

#### Scenario: Playback runtime loading guard covers all display routes

- **WHEN** the web test suite scans the runtime entry source for Overview, Solar, FactoryCircuit, Images, and Sustainability
- **THEN** every shared loading-state return path is verified to have no React hook calls between the loading return and the page main JSX return
- **AND** a violation identifies the affected playback page so the staged loading return can be moved after hook evaluation

##### Example: loading return region contains no hook calls

| Page | Source Region | Expected Result |
| ----- | ----- | ----- |
| `solar` | from `return <DisplayPageLoadingState />;` to the page main `return (` | no `useMemo`, `useEffect`, `useState`, or other React hook call appears in the region |
| `sustainability` | from `return <DisplayPageLoadingState />;` to the page main `return (` | no `useMemo`, `useEffect`, `useState`, or other React hook call appears in the region |
