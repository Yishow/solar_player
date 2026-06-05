# FHD Evidence Bundle Template

日期：2026-05-27

這份模板用來為 FHD 相關 change 準備 evidence bundle。每次只覆蓋一個 reviewable scope，避免把 playback、management、editor 混成一包。

## Bundle Header

- Change:
- Witness batch:
- Surface family:
- Affected surfaces:
- Protected attributes:
- Boundary guide:
  - `docs/reference-match/fhd-reference-informed-closeout-boundaries.md`
- Linked checklist:
  - `docs/display-surface-visual-review-checklist.md`
- Linked exception ledger:
  - `docs/reference-match/fhd-exception-ledger-template.md`
- Verification pack:

## Required Vocabulary

- `witness batch`: 這次要一起審的頁面或 surface 集合。
- `surface family`: `playback`、`management`、`editor`、`launch audit` 其中一類。
- `protected attributes`: 本 batch 不可默默退化的 FHD/visual contracts。
- `boundary decision`: reference mismatch 的分類記錄，用來分辨 accepted shell choice、reference-inspired quality target、actual launch gap。
- `protected-product-choice`: 已被產品 review 接受的現行產品選擇；只保護列出的 Protected Attributes。
- `reference-quality-target`: 參考圖提供質感方向，但不要求 pixel match。
- `actual-gap`: 仍需要 editor capability、runtime parity、asset/content、fallback、publish refresh、visual tuning 或 handoff evidence 的缺口。
- `exception ledger`: 所有偏離 witness 的持久記錄。
- `verification pack`: 本 batch 需要重跑的 commands、manual checks、result note。

## Review Body

### 1. Witness batch

- Pages or surfaces:
- Why these belong together:

### 2. Surface family

- `playback`
- `management`
- `editor`
- `launch audit`

只選一個為主；若真的跨 family，請拆成另一份 evidence bundle。

### 3. Protected attributes

- Hero hierarchy:
- Card-family rhythm:
- Photo fade:
- Source-like icon language:
- Absolute composition:
- Distance readability:

### 4. Reference-informed boundary decisions

| Surface | Classification | Current Product Choice | Reference Quality Cue | Gap Type | Protected Attributes | Implementation Consequence | Verification Gate | Witness Evidence | Accepted By | Revisit Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Shared header/footer | `protected-product-choice` | 目前 header/footer 高度、位置或資訊密度已被接受。 | Keep shell readable and stable without pixel matching reference geometry. | n/a | Height, position, information density. | Preserve listed shell attributes while tuning page content separately. | n/a | FHD witness path and review note. | Product review owner/date. | Revisit if shell wraps, overlaps, loses readability, or route count changes. |
| Page content surface | `reference-quality-target` | Current page remains product-owned. | Hero hierarchy, KPI rhythm, flow language, media stage density, ornament balance, caption tension, highlight rail density. | n/a | None. | Tune toward the named quality cue without changing protected shell attributes. | n/a | Page route/reference witness pair. | n/a | Revisit after page witness capture. |
| Runtime or capability blocker | `actual-gap` | Current implementation cannot provide launch evidence or required authoring control. | Desired quality cue or launch behavior. | Runtime parity, editor capability, asset/content, fallback, publish refresh, visual tuning, or handoff evidence. | None. | Keep gate fail/blocked and link the follow-up task or change. | Named launch gate or verification step that must pass before the blocker can close. | Test, witness, or blocker evidence. | n/a | Revisit when verification gate passes. |

Incomplete boundary evidence rules:

- A `protected-product-choice` row with Accepted By empty, missing accepted-by, missing owner, missing Protected Attributes, or missing Witness Evidence cannot waive visual review.
- A `reference-quality-target` row without Reference Quality Cue or Implementation Consequence cannot be used as implementation guidance.
- An `actual-gap` row without Gap Type, Verification Gate, Witness Evidence, or Revisit Trigger cannot be used to close launch status.

### 5. Before / after checkpoints

- Before:
- After:
- Review notes:

### 6. Exception ledger handoff

- Exception ledger path:
- New exceptions added:
- Existing exceptions reused:

### 7. Verification pack

- Automated checks:
- Manual witness checks:
- Follow-up recording path:

## Example surface-family fit

- `playback`: `/overview`, `/solar`, `/factory-circuit`, `/images`, `/sustainability`
- `management`: FHD witness management pages and shared operator shells
- `editor`: `/display-pages/editor` and its integrated workspace styling
