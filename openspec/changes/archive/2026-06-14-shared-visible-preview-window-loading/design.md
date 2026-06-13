## Context

live preview catalog 已經把 loader 集中，但 shared behavior 仍偏向全量 hydration。對 Playback Settings 與 Slideshow Preview 來說，真正需要的是 visible-window-first：先顯示看得到的 preview cards，再背景補齊 deferred keys。若 shared contract 不先定義好，page-local 微調很容易把 preview loading 邏輯分散到各頁。

## Goals / Non-Goals

**Goals:**

- 讓 preview consumer 先載 requested visible page keys。
- 保留 deferred key 的 loading、warm reuse、與 partial failure isolation。
- 把 no-regression 邊界寫進 contract：preview status、publish semantics、display sync refresh 不退化。

**Non-Goals:**

- 不處理 preview catalog 之外的 shared cache。
- 不處理 page-local tick isolation 或 rotation controller。

## Decisions

### Decision 1: Requested visible window first

preview consumer 必須傳入 requested visible page keys。shared loader 先解析這個 window，再背景補齊 deferred keys。

### Decision 2: Deferred keys keep isolated state

deferred keys 不能阻塞主 surface；失敗時只能更新自己的 error state，不能清空已解析或已在 loading 的可見 keys。

### Decision 3: No-regression preview refresh boundary

display sync、manual refresh、與 publish 相關 status 仍需維持既有 refresh semantics。preview loading window 只改載入順序，不改 card status contract。

## Implementation Contract

- Behavior: requested visible page keys SHALL 先顯示 loading、warm、或 resolved preview state；deferred keys SHALL 在背景補齊。單一 key 失敗時，只影響該 key。
- Interface / data shape: preview consumer 需要顯式提供 requested key window；shared loader 需要回傳 requested、deferred、resolved、failed state 的一致 keyed output，且 page identity 仍以 pageKey 或實例鍵為準，不能因 visible window 載入而把 duplicate instance 合併成同一份 state。
- Failure modes: background preview failure 不得清空其他 keys；display sync refresh 不得漏掉 deferred keys 的後續更新。
- Acceptance criteria: preview catalog tests 需證明 requested window 優先載入； Playback Settings 與 Slideshow Preview tests 需證明可見 cards 不必等待 deferred keys；error isolation tests 需證明單一卡片失敗不會拖累其他卡片。
- Scope boundaries:
  - In scope: requested window contract、deferred state、error isolation、consumer integration。
  - Out of scope: registry/config cache、page-local tick isolation。

## Risks / Trade-offs

- [Risk] deferred keys 顯示較晚會被誤判為漏資料。 → Mitigation: 明確顯示 loading / deferred state。
- [Risk] requested window 設定錯誤可能漏掉需要首屏顯示的 card。 → Mitigation: 由 consumer 明確傳入可見 card window，並以 tests 固定。
