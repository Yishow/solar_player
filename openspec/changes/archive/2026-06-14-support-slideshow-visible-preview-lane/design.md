## Context

Slideshow Preview 的首屏價值在於 rotation status、current page、queue cards。若不可見 cards 的 preview state 也一起 blocking，就會浪費支援面的首屏成本。這頁需要明確的 visible-card preview lane contract。

## Goals / Non-Goals

**Goals:**

- 讓可見 cards 先解析 preview state。
- 保留 rotation control、summary、queue、debug state 可用。
- 保留 manual next / prev 與 error semantics 不退化。

**Non-Goals:**

- 不改 rotation controller。
- 不處理其他 support 頁。

## Decisions

### Visible-card preview lane first

可見 cards 先請求 preview state；不可見 cards 延後。

### Rotation controls stay outside deferred preview loading

rotation control、summary、queue index、debug state 不依賴 deferred card preview 完成。

### No-regression queue and error behavior

manual next / prev、queue、error semantics 保持等價。

## Implementation Contract

- Behavior: Slideshow Preview 的 visible cards SHALL 先顯示 loading、warm、或 resolved preview；deferred cards 不得阻塞 rotation control 與 summary。
- Interface / data shape: visible card window 與 deferred cards 需要分開傳入 preview lane。
- Failure modes: 某張 card preview 失敗時只影響該卡；rotation control 仍可用。
- Acceptance criteria: visible-card tests 需證明 deferred cards 不阻塞主 lane； queue / control tests 需證明 manual navigation 不退化。
- Scope boundaries:
  - In scope: Slideshow Preview visible preview lane。
  - Out of scope: shared preview foundation、rotation controller 算法、其他 support 頁。

## Risks / Trade-offs

- [Risk] deferred card 載入較晚可能讓非當前卡片暫時只有 loading state。 → Mitigation: 保留明確 loading state，不影響 visible queue 操作。
