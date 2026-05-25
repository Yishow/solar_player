# Display Surface Visual Review Checklist

適用於任何會改動 playback display pages、shared display chrome、live preview presentation、或 FHD geometry 的 change。

## Checklist

1. Hero typography
   - 標題、eyebrow、subtitle 是否仍使用 display semantic tokens，且字級/字距在展示距離下可讀。
2. Photo fade
   - 主視覺淡出是否仍走 shared fade roles，不因局部調整引入生硬切邊或原始色票漂移。
3. Card family
   - KPI / info card 是否優先沿用 `DisplayCardFrame`、`DisplayCardHeader`、`DisplayCardValueRow`、`DisplayCardFooter`。
4. Ornament consistency
   - leaf / gold ornaments 是否仍使用 shared ornament tokens，而非 page-local raw colors。
5. Live preview mode
   - showcase contexts 是否明確使用 showcase mode；editor / management contexts 是否維持預設 editor behavior。
6. FHD geometry
   - `left`、`top`、`width`、`height` 的變動是否為刻意調整，且已在 task / review note 中說明。
7. Distance readability
   - 在 `/overview`、`/solar`、`/factory-circuit`、`/images`、`/sustainability`、`/slideshow-preview` 中，關鍵標題、數值、狀態是否仍能在展示距離辨識。

## Allowed Exceptions

- `data:image/svg+xml` 內嵌圖樣可保留 literal values，但應限制在 data URI 本身，不外溢到 shared chrome roles。
- 一次性 mask / icon silhouette 若目前沒有 shared token role，可保留 page-local literal，前提是有清楚註解或 change note。
- 特殊漸層可保留 literal stop 組合，但 shared hero/card/ornament roles 仍應優先使用 semantic tokens。
- 無法合理套用 shared primitive 的 page-specific treatment，需在 change proposal 或 code comment 註明原因。

## Review Note Template

- Routes reviewed:
- Shared primitive exceptions:
- Intentional FHD geometry changes:
- Distance readability result:
