## Context

Images 頁面的 route entry 已不再卡住，但 activeIndex 仍容易與 playlist runtime path 綁在一起。對這頁來說，效能優化的核心不是再做 staged loading，而是把本地切圖與遠端 playlist refresh 拆成兩條邏輯，避免每次 active item 變化都擴大成資料同步事件。

## Goals / Non-Goals

**Goals:**

- 讓 autoplay、manual navigation 使用本地 active item state。
- 讓 remote playlist refresh 只在 playlist 真正改變時發生。
- 保留 active caption、thumbnail、main stage、fallback 行為。

**Non-Goals:**

- 不調整頁面版型或 playlist 治理 API。
- 不處理其他 playback 頁。

## Decisions

### Decision 1: Local active item navigation first

active item state 由本地 navigation 管理；autoplay、manual next、manual prev 都基於同一份 reusable playlist payload 進行。

### Decision 2: Remote refresh only on playlist changes

playlist remote read 只在 playlist refresh、display sync、或 governance change 發生，不跟著每次 active item change 重跑。

### Decision 3: No-regression visible stage, shuffle, and fallback behavior

main stage、caption、thumbnail、shuffle autoplay、fallback 行為必須與既有可見結果等價。

## Implementation Contract

- Behavior: active item change SHALL 由本地 navigation 處理；playlist refresh SHALL 只在遠端資料真的需要同步時發生；refresh 期間既有 active item 與 visible stage 必須保留。
- Interface / data shape: useImagePlaylistRuntime 需要區分 reusable playlist payload 與 active item navigation；Images page 需要在 refresh 後 reconcile active item。
- Failure modes: refresh 失敗時保留既有 active item、caption、thumbnail、shuffle 狀態、與 fallback banner；不得把失敗視為成功切換。
- Acceptance criteria: autoplay / manual navigation / shuffle tests 需證明不會 per-item remote read；refresh tests 需證明 active item 仍能 reconcile；fallback tests 需證明 visible stage 不退化。
- Scope boundaries:
  - In scope: Images 的 active navigation、playlist refresh、active item reconcile。
  - Out of scope: page layout、other playback pages、management playlist governance surface。

## Risks / Trade-offs

- [Risk] active item reconcile 若做錯，可能在 playlist refresh 後跳到錯誤項目。 → Mitigation: 以 refresh-reconcile tests 固定行為。
