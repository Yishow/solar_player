# Display Launch Witness Matrix

日期：2026-05-27

這份 matrix 是 display launch 的 single authoritative launch status ledger。`all-pages-audit.md` 與 `all-pages-checklist.md` 只提供 supporting input，不再平行維護 launch pass/fail。

## Status Vocabulary

- `pass`
- `fail`
- `blocked`

若沒有新鮮 witness，不要猜測；先標 `blocked` 並寫 blocker note。

## Page-by-Page Matrix

| Route | Authoring | Runtime parity | Publish refresh | Fallback | Handoff | Overall | Blocker notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/overview` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | 尚未依 `display-launch-verification-pack.md` 回填新鮮 witness。 |
| `/solar` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | 尚未依 `display-launch-verification-pack.md` 回填新鮮 witness。 |
| `/factory-circuit` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | 尚未依 `display-launch-verification-pack.md` 回填新鮮 witness。 |
| `/images` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `Images` 的 playlist/fallback witness 尚未重新確認。 |
| `/sustainability` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | editor/runtime parity 與 fallback witness 尚未重新確認。 |

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
