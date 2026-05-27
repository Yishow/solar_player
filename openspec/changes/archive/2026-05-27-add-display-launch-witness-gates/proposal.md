## Why

目前五個 display 頁、editor authoring coverage、page alignment change 與多個 runtime contract change 都已經各自有 artifacts，但「可以上線」還沒有被定義成一套 witness gate。這使得 repo 容易出現 spec complete、demo 可以、但真正 publish/runtime/fallback/operator handoff 還沒被整體驗證的狀況。

## What Changes

- 建立一套專屬於 display 上線前的 witness gate，覆蓋五個 playback 頁、`/display-pages/editor`、publish refresh、fallback、asset/shell handoff 與 operator review。
- 把 `product complete` 的定義從「功能/規格已存在」提升成「逐頁 witness matrix、publish/runtime parity、fallback、handoff 均已驗證」。
- 讓上線審核有固定 evidence bundle、command pack 與單一狀態記錄格式，而不是每次憑記憶拼湊。

## Capabilities

### New Capabilities

- `display-launch-witness-gates`: 定義五個 playback 頁與相關 editor/publish/fallback/handoff 的上線 witness gate。

### Modified Capabilities

- `display-editor-page-authoring-coverage`: 將「有 authoring coverage」延伸成可上線的 witness 驗證語境，要求逐頁驗證 editor/runtime parity。
- `display-page-draft-live-publishing`: 將 publish success 的完成定義延伸為 live refresh 與 operator-visible confirmation。

## Impact

- Affected specs:
  - `display-launch-witness-gates`
  - `display-editor-page-authoring-coverage`
  - `display-page-draft-live-publishing`
- Affected code:
  - Modified:
    - `openspec/specs/display-editor-page-authoring-coverage/spec.md`
    - `openspec/specs/display-page-draft-live-publishing/spec.md`
    - `docs/reference-match/all-pages-audit.md`
    - `docs/reference-match/all-pages-checklist.md`
  - New:
    - `openspec/specs/display-launch-witness-gates/spec.md`
    - `docs/reference-match/display-launch-witness-matrix.md`
    - `docs/reference-match/display-launch-verification-pack.md`
  - Removed:
    - (none)
