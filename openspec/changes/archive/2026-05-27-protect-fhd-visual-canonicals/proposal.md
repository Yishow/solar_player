## Why

目前 repo 已經有 FHD reference、page-alignment change 與 visual checklist，但 AI 在持續修改 playback 前端時，仍會把頁面往 generic dashboard、management control board 或局部 token cleanup 的方向拉。問題不是「沒有設計資產」，而是缺少一份明確的 playback 視覺正典，讓後續變更知道哪些質感元素是不可默默退化的。

## What Changes

- 擴充 `display-surface-visual-guardrails`，把 playback FHD 頁面的非協商視覺正典寫成 requirement，而不只是一份可參考的 checklist。
- 定義 playback 視覺變更的 canonical witness source，明確指定 `docs/reference/FHD/` 與對應 prototype page 是 review 對照基準。
- 明確禁止 hero、KPI、focus composition 被 management-style table、toolbar、generic board、dashboard card 語言滲透，除非 change 明示例外與理由。
- 把「source-like icon / ornament / photo fade / absolute-region hierarchy / distance readability」從審美描述提升為受保護的 display contract。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `display-surface-visual-guardrails`: 把 playback FHD 頁面的視覺正典、reference witness 對照、以及 management-surface drift 禁制納入正式規格。

## Impact

- Affected specs: `display-surface-visual-guardrails`
- Affected code:
  - Modified:
    - `openspec/specs/display-surface-visual-guardrails/spec.md`
    - `docs/display-surface-visual-review-checklist.md`
    - `docs/reference-match/all-pages-checklist.md`
    - `apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts`
  - New:
    - `docs/reference-match/playback-visual-canonicals.md`
  - Removed:
    - (none)
