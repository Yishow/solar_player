# FHD Reference-Informed Closeout Boundaries

日期：2026-06-05

這份文件定義 FHD closeout 如何使用 `docs/reference/FHD/` 參考圖：reference 是質感方向與 witness 對照，不是預設 pixel-match gate。若目前產品選擇已被接受，例如 header/footer 的高度、位置、資訊密度，closeout 要先把它標成受保護的 product choice，再把真正需要推進的頁面內容分開處理。

## Boundary Principle

- 先分類，再調值：每個重要 reference mismatch 都先標記 classification，才進入五頁 visual tuning 或 editor capability planning。
- 保護 scope 要小：`protected-product-choice` 只保護列出的 shell attribute，不自動保護同頁 hero、KPI、flow、circuit、media stage、caption、ornament、highlight rail。
- 質感往 reference 推：`reference-quality-target` 描述 hierarchy、density、photo integration、ornament balance、source-like flow language、rhythm 等方向，不要求 exact pixel position。
- 真缺口要可驗證：`actual-gap` 必須連到 editor capability、runtime parity、asset/content、fallback、publish refresh、visual tuning 或 handoff evidence 的下一步。

## Classification Tokens

| Classification | Meaning | Required evidence | Implementation consequence |
| --- | --- | --- | --- |
| `protected-product-choice` | 現行產品選擇已被接受，雖與 reference 不同但本輪 closeout 要保留。 | Surface, Protected Attributes, Witness Evidence, Accepted By, Revisit Trigger | Preserve the listed attributes; do not use this row to waive unrelated page content review. |
| `reference-quality-target` | Reference 提供質感方向，但不要求逐像素追齊。 | Surface, Reference Quality Cue, Implementation Consequence, Witness Evidence | Tune toward the named quality cues without pixel matching unless a separate `actual-gap` requires it. |
| `actual-gap` | 目前產品仍有 launch-relevant 缺口。 | Surface, Gap Type, Implementation Consequence, Verification Gate, Witness Evidence, Revisit Trigger | Keep the relevant launch gate fail or blocked until the gap verification passes. |

## Boundary Decision Table

每份 FHD evidence bundle 若涉及 reference mismatch，至少填入下列欄位：

| Surface | Classification | Current Product Choice | Reference Quality Cue | Gap Type | Protected Attributes | Implementation Consequence | Verification Gate | Witness Evidence | Accepted By | Revisit Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Shared header | `protected-product-choice` | Current shell uses accepted height and position instead of the reference geometry. | Keep header readable and quiet at display distance. | n/a | Height, top position, connection/weather information density. | Preserve these shell attributes during page polish. | n/a | FHD playback witness plus product review note. | Product review, 2026-06-05 user direction. | Revisit if header content wraps, overlaps, or loses 3-5m readability. |
| Shared footer | `protected-product-choice` | Current footer/nav band position and density are accepted. | Keep route navigation stable without copying reference footer geometry. | n/a | Height, bottom position, five-route nav density. | Preserve these shell attributes during page polish. | n/a | FHD playback witness plus product review note. | Product review, 2026-06-05 user direction. | Revisit if nav labels wrap, footer overlaps content, or route count changes. |
| Overview hero and KPI row | `reference-quality-target` | Existing controls remain product-owned. | Hero photo fade, bilingual title rhythm, KPI row spacing. | n/a | None. | Tune content hierarchy and card rhythm without moving protected shell. | n/a | `/overview` witness pair. | n/a | Revisit after Overview witness capture. |
| Images runtime gallery | `actual-gap` | Runtime playlist state can still block final gallery witness. | Media stage density and caption tension are desired. | Runtime parity / fallback witness | None. | Keep fallback/runtime gate blocked until playlist witness passes. | Launch matrix runtime parity and fallback gates stay blocked until playlist witness passes. | `/images` witness pair and playlist/fallback check. | n/a | Revisit after runtime gallery evidence exists. |

## Minimum Evidence Rules

- `protected-product-choice` is incomplete when Surface, Protected Attributes, Witness Evidence, Accepted By, or Revisit Trigger is empty.
- `reference-quality-target` is incomplete when Surface, Reference Quality Cue, Implementation Consequence, or Witness Evidence is empty.
- `actual-gap` is incomplete when Surface, Gap Type, Implementation Consequence, Verification Gate, Witness Evidence, or Revisit Trigger is empty.
- Incomplete boundary evidence cannot waive a visual guardrail and cannot mark a launch witness gate as pass.
- A protected shell decision cannot cover page content unless the page content appears as its own boundary decision row.

## Five-Page Quality Target Map

| Page | Protected product choice example | Reference quality target examples | Actual gap examples |
| --- | --- | --- | --- |
| Overview | Shared header height and position. | Hero photo fade, bilingual title rhythm, KPI row spacing. | Missing fresh runtime/publish/fallback witness. |
| Solar | Shared footer height and nav position. | Connector thickness, flow node placement, source-like node language, KPI row rhythm. | Connector treatment only if existing editor controls cannot express witness needs. |
| Factory Circuit | Shared shell information density. | Circuit line weight, ornament balance, load panel display hierarchy. | Connector stroke or load-row rhythm capability only if witness proves existing controls insufficient. |
| Images | Shared header/footer position. | Media stage crop, thumbnail strip density, caption display tension. | Runtime playlist/fallback witness or production image-set governance. |
| Sustainability | Shared footer position. | Ring ornament integration, hero media overlap, tree/stat rhythm, highlight rail density. | Ring/media treatment or hero media effects capability only if existing controls cannot express witness needs. |

## Launch Matrix Relationship

Boundary decisions are supporting evidence. `docs/reference-match/display-launch-witness-matrix.md` remains the single authoritative launch status ledger.

- A `protected-product-choice` can explain why a listed shell difference is not a visual fail.
- A `reference-quality-target` can explain what page content still needs visual tuning.
- An `actual-gap` keeps the relevant gate fail or blocked until its verification passes.
- No boundary row can mark a page launch-ready by itself.

## Review Checklist

- Does every important reference mismatch have exactly one classification token?
- Does every `protected-product-choice` list Protected Attributes, Witness Evidence, Accepted By, and Revisit Trigger?
- Does every `reference-quality-target` name concrete quality cues rather than saying "make it closer"?
- Does every `actual-gap` name the gap type and verification gate?
- Are accepted header/footer choices separated from page content review?
- Does the launch matrix keep pass/fail/blocked status instead of moving status into this document?
