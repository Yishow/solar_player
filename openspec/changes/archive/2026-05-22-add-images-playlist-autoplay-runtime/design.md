## Context

`Images` runtime 已經透過 playlist runtime contract 取得 `entries`、`activeEntry`、fallback mode 與每筆 `durationSeconds`，但 page component 目前只靠本地 `activeIndex` 與手動按鈕切換。這代表 server 與 management side 都認為 `Images` 是 playlist domain，實際播放頁卻沒有把 duration-driven rotation 落地。

此 change 不需要更動 governance schema；核心是補一層小型 autoplay runtime，使播放頁能在不破壞既有 manual navigation 與 fallback behavior 的前提下，真正依 playlist entry duration 前進。

## Goals / Non-Goals

**Goals:**

- 讓 `Images` 播放頁依 resolved playlist entry 的 `durationSeconds` 自動前進。
- 讓 manual prev/next 與 thumbnail click 仍可用，且操作後 timer 會從新 active slide 重新開始。
- 讓 fallback-active entries、單張 playlist 與 runtime refresh 都遵循同一個 autoplay loop。

**Non-Goals:**

- 不改 image playlist persistence、governance UI、fallback mode schema 或 `image_playlist_entries` table。
- 不讓 `Images` 接入全站 playback rotation controller；此 change 只處理頁內 slideshow autoplay。
- 不新增跨頁全域播放狀態或新的 socket event。

## Decisions

### Decision: Derive autoplay timing from the resolved active playlist entry

autoplay timer 直接讀目前 resolved active slide 的 `durationSeconds`，而不是讀 seed config、thumbnail count 或 page-level常數。這可確保 management 端設定的 per-entry duration 真正影響播放頁行為，也讓 fallback-active entry 與正常 entry 共用同一套計時來源。

### Decision: Reset autoplay only when the active slide identity changes

timer 應在 active slide identity 變更時重新計時，例如 manual next/prev、thumbnail click、runtime refresh 導致 active entry 改變；但不應在每次 render 或非關鍵 state 變化時重置。這樣能避免 refresh 後出現「永遠停留在第一張」或倒數反覆歸零的抖動。

### Decision: Keep manual navigation and fallback entries inside the same autoplay loop

manual navigation 不應關掉 autoplay；它只是切換 active slide 並重新開始該 slide 的 duration。fallback-active entry 也仍屬於 autoplay loop 的一環，除非 playlist 沒有任何可播放 entry。這樣 `Images` 才能維持「playlist continues even when some entries degrade」的既有 domain contract。

## Implementation Contract

- Behavior:
  - `Images` page SHALL advance to the next playable slide automatically after the resolved active slide's `durationSeconds` elapses.
  - Manual prev/next 或 thumbnail selection 後，新的 active slide SHALL 立即顯示，且 autoplay SHALL 以該 slide 的 duration 重新計時。
  - 當 active slide 是 fallback-active entry（例如 placeholder 或 use-cover）時，autoplay SHALL 仍照該 entry 的 duration 前進到下一個 playable entry。
  - 當 playlist 只有一個 playable entry 時，autoplay MAY keep the same slide active by restarting the timer, but SHALL NOT produce index drift or errors.
- Interface / data shape:
  - 新增一個 page-local 或 shared hook，對外至少提供 active index、manual navigation handlers 與 autoplay lifecycle。
  - `useImagePlaylistRuntime()` 仍提供 resolved playlist payload；不需變更 server response shape。
- Failure modes:
  - 沒有 playable entry 時，autoplay SHALL stay idle and the page SHALL keep the existing empty/fallback presentation.
  - runtime refresh 若讓 active entry 消失，hook SHALL clamp or remap the active index to a valid playable entry，而不是保留失效 index。
- Acceptance criteria:
  - 自動測試需覆蓋 per-entry duration auto-advance、manual navigation reset、fallback-active entry continued autoplay 與 single-entry loop stability。
  - `pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/web build` SHALL 通過。
- Scope boundaries:
  - In scope: page-level autoplay timer、active index remap、manual navigation reset semantics、runtime refresh interaction。
  - Out of scope: playlist persistence、management UI、global playback rotation plan。

## Risks / Trade-offs

- [Risk] timer 與 runtime refresh 同時發生時，active index 可能跳錯張。
  → Mitigation: 將 autoplay source of truth 綁定到 resolved active slide identity，refresh 後先 remap 再重啟 timer。
- [Risk] 若把 autoplay 寫進 page component 本體，後續很難測與維護。
  → Mitigation: 抽成獨立 hook，讓 timer 行為用 unit test 驗證。
- [Risk] single-entry playlist 若處理不當，可能每個 tick 都重設 state 造成不必要 render。
  → Mitigation: 對 single playable entry 明確走 restart-same-slide 分支，避免 index churn。
