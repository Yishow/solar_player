## Context

播放端已經有 `PlaybackSettings`、`playback_pages` 與 schedule 邏輯，但目前對 display pages 的輪播治理仍偏基礎，無法表達因 display readiness、素材健康、未發布草稿或時段規則而跳頁的原因。後續若 display operations 變多，rotation 規則需要成為獨立且可觀測的能力。

## Goals / Non-Goals

**Goals:**

- 定義 display page rotation plan，涵蓋啟用狀態、排序與每頁停留秒數。
- 補齊 conditional playback，讓頁面可依 readiness、時段與維護狀態決定是否播放。
- 提供 skip reason reporting，讓 management surface 可理解正式輪播鏈的真實結果。

**Non-Goals:**

- 不在此 change 內處理單張圖片 playlist 編排。
- 不在此 change 內處理 editor 畫布操作。
- 不在此 change 內重寫現有 MQTT offline routing 的整體策略。

## Decisions

### Keep rotation plan as a first-class playback model

rotation plan 不附屬在單一 display page config，而是維持在播放層的 shared model。這讓排序、停留秒數、啟用狀態與 start page 可以和現有 `PlaybackSettings`、`PlaybackPage` 同一層協作。

### Evaluate conditional playback at runtime with explicit skip reasons

conditional playback 在 runtime 決策，但每次決策都需產生明確 skip reason，例如 `disabled`, `out-of-schedule`, `unpublished`, `asset-unhealthy`, `data-not-ready`。這讓播放端與管理端能看到同一結果。

### Expose rotation preview through management surfaces

rotation preview 不僅存在於播放器 hook，也要在 management surface 提供。這樣維運人員可以在不切去正式輪播的情況下驗證當前條件下會播放哪些頁面。

## Implementation Contract

- Behavior:
  - 維運人員可設定 display page 的正式輪播順序、啟用狀態與停留秒數。
  - runtime 會依 schedule、頁面 readiness 與健康狀態決定是否播放某頁，並保留 skip reason。
  - `PlaybackSettings` 或其他 management surface 可預覽當前條件下的有效輪播鏈。
- Interface / data shape:
  - 共享型別需支援 rotation plan 與 skip reason 枚舉。
  - server 提供 rotation plan 讀寫與預覽結果查詢，回應至少包含 `playablePages`, `skippedPages`, `skipReason`。
- Failure modes:
  - 所有頁面都不可播時，系統回退到既有 offline 或安全畫面，而不是陷入空輪播。
  - 未知 skip reason 不得靜默吞掉，應至少作為可診斷字串返回。
- Acceptance criteria:
  - server tests 覆蓋 rotation plan persistence、conditional playback 計算與 skip reason 回應。
  - web tests 覆蓋 preview 顯示與設定變更後同步更新。
- Scope boundaries:
  - in scope: display page rotation plan、conditional playback、skip reason reporting。
  - out of scope: asset library 詳細治理、image slide metadata。

## Risks / Trade-offs

- [Risk] skip reason 種類過多導致 UI 複雜 → Mitigation: 先用有限枚舉，必要時擴充細項。
- [Risk] runtime 與 management preview 計算分岔 → Mitigation: 共用 shared resolver 或 server-side preview 邏輯。
- [Risk] rotation plan 與既有 playback settings 重疊 → Mitigation: 明確保留播放層為輪播真相來源，display config 不自帶排序規則。
