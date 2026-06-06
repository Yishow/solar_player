# Display Launch Witness Matrix

日期：2026-05-27

這份 matrix 是 display launch 的 single authoritative launch status ledger。`all-pages-audit.md` 與 `all-pages-checklist.md` 只提供 supporting input，不再平行維護 launch pass/fail。

## Status Vocabulary

- `pass`
- `fail`
- `blocked`

若沒有新鮮 witness，不要猜測；先標 `blocked` 並寫 blocker note。

## Boundary Rationale Rule

Reference-informed boundary decisions explain status rationale; they do not replace this matrix. This file remains the single authoritative launch status ledger.

The 2026-06-05 reference-informed witness batch is classified in `docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md`. That batch supplies DOM-measured visual/structure boundary evidence only; it does not provide fresh runtime parity, publish refresh, or fallback witness, so every route below stays `blocked`.

- `protected-product-choice` can explain why an accepted header/footer height, position, or information-density difference is not a visual fail for the listed Protected Attributes.
- `reference-quality-target` records page content quality direction, such as hero rhythm, flow clarity, media density, circuit language, or highlight rail density.
- `actual-gap` keeps the relevant gate `fail` or `blocked` until runtime, fallback, publish refresh, editor capability, asset/content, visual tuning, or handoff evidence passes.
- A `protected-product-choice` does not make a page launch-ready by itself.

## Page-by-Page Matrix

| Route | Authoring | Runtime parity | Publish refresh | Fallback | Handoff | Overall | Boundary rationale | Blocker notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/overview` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | Accepted header/footer can be recorded as `protected-product-choice`; hero photo fade and KPI row rhythm remain `reference-quality-target`. | 尚未依 `display-launch-verification-pack.md` 回填新鮮 witness。 |
| `/solar` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | Accepted footer/nav shell can be recorded as `protected-product-choice`; connector thickness, flow node placement, and KPI row rhythm remain `reference-quality-target`. | 尚未依 `display-launch-verification-pack.md` 回填新鮮 witness。 |
| `/factory-circuit` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | Accepted shell density can be recorded as `protected-product-choice`; circuit line weight, ornament balance, and load panel hierarchy remain `reference-quality-target`. | 尚未依 `display-launch-verification-pack.md` 回填新鮮 witness。 |
| `/images` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | Accepted header/footer can be recorded as `protected-product-choice`; runtime playlist/fallback witness remains `actual-gap` until verified. | `Images` 的 playlist/fallback witness 尚未重新確認。 |
| `/sustainability` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | Accepted footer shell can be recorded as `protected-product-choice`; ring/media overlap and highlight rail density remain `reference-quality-target` until witness review. | editor/runtime parity 與 fallback witness 尚未重新確認。 |

## Gate Meanings

- `authoring`
  - `/display-pages/editor` 對應頁面的 authoring coverage 已可操作，且 reviewer 有記錄 witness。
- `runtime parity`
  - playback route 與 editor-authored content 能對得上。
- `publish refresh`
  - publish success 後，live playback 有實際刷新，且 operator 看得到刷新結果。
- `fallback`
  - 缺資料、缺媒體、或 degraded mode 時不會空白或破版。
- `handoff`
  - reviewer 可以把目前狀態交給下一位操作者，不靠聊天記憶。

## Recording Rule

- 每次 rerun `display-launch-verification-pack.md`，都把 pass/fail/blocked 寫回這份 matrix。
- supporting input 可來自 `docs/reference-match/all-pages-audit.md`、`docs/reference-match/all-pages-checklist.md`、editor/runtime targeted tests，但 launch status 只在這份 matrix 更新。

## Closeout Progress Log

視覺 closeout 進度只記錄 `reference-quality-target` 的 config-level 調整，**不改任何 launch gate 狀態**。視覺改善 ≠ launch-ready；所有 gate 在取得 fresh runtime parity / publish refresh / fallback witness 前維持 `blocked`。

| Date | Change | Route | Visual closeout result（config-level） | Launch status |
| --- | --- | --- | --- | --- |
| 2026-06-06 | `polish-overview-solar-reference-quality-targets` | `/overview` | hero fade 放寬、KPI padding/value 微增（editor-backed）。詳見 `overview-solar-reference-quality-closeout.md` | 維持 `blocked`（fresh 視覺 witness 批次延 Phase 2；runtime/fallback/publish 未驗） |
| 2026-06-06 | `polish-overview-solar-reference-quality-targets` | `/solar` | connector 加粗、KPI 等寬（editor-backed）。actual-gap：node/connector 飽和、gold/leaf 基底、hero framing 留 Phase 4 | 維持 `blocked`（同上） |
