## Context

目前 registry 與 config 已有快取，但 shared consumer 的使用邊界仍不夠明確：有些 consumer 在 warm state 存在時仍會走 blocking read，有些 consumer 的 force refresh 與 display sync 只保證資料更新，沒有明確保證 visible state 不回退。這會讓後續 page-local 優化很難安全依賴 shared cache。

## Goals / Non-Goals

**Goals:**

- 讓 route loader、route host、preview consumer、editor、playback consumer 共用同一套 registry / config warm cache contract。
- 讓 force refresh 與 display sync 保持 authoritative refresh，同時不破壞首屏可見性。
- 把 no-regression 邊界寫進 contract：error、fallback、reload 行為不得因 cache reuse 改變。

**Non-Goals:**

- 不處理 preview catalog 的 visible-window loading。
- 不處理 page-local story、playlist、或 editor interaction cost。

## Decisions

### Decision 1: Shared registry snapshot reuse

所有 consumer 先重用相同的 registry pending 或 settled snapshot，再決定是否做背景 refresh。這避免 route loader 與 mounted consumer 對同一份 registry 重複 blocking read。

### Decision 2: Shared live config envelope reuse

live config envelope 的 first visible render 一律先查 warm cache。只有 force refresh、display sync、或 cache miss 才走 authoritative read。這把 warm render 與 refresh path 明確分離。

### Decision 3: No-regression cache invalidation boundary

cache invalidation 只能影響 refresh path，不能讓既有 fallback、error、reload、或 visible state semantics 退化。任何 shared cache 優化都要保留現有失敗語意。

## Implementation Contract

- Behavior: 有 warm registry 或 live config 時，consumer SHALL 先用 warm state 顯示；force refresh 與 display sync SHALL 仍會重新抓 authoritative data，但 visible state 不得退回成不必要的 cold blank state。
- Interface / data shape: useDisplayPageRegistry 與 useDisplayPageConfig 需要有一致的 warm cache、pending request、force refresh 邊界；displayPageRouteHost 的 route loader 與 mounted host 需重用相同 contract。
- Failure modes: refresh 失敗時，既有 warm state、fallback、error message 必須保留；不得把失敗偽裝成成功 refresh。live-stage warm cache reuse 也不得污染 draft-stage baseline、dirty state、save、或 conflict semantics。
- Acceptance criteria: hook / route tests 需證明 warm cache 命中時無 duplicate blocking read；force refresh tests 需證明資料仍可更新；error / fallback tests 需證明語意不回退。
- Scope boundaries:
  - In scope: registry/config warm cache reuse、cache invalidation、route-host integration。
  - Out of scope: preview loading strategy、page-local rerender、editor dirty tracking。

## Risks / Trade-offs

- [Risk] cache invalidation 邊界錯誤會讓 stale config 停留。 → Mitigation: 保留 explicit force refresh 與 display sync refresh path，並用 tests 鎖定。
- [Risk] shared cache 可能掩蓋某些 consumer 本來的 error path。 → Mitigation: 把 no-regression error semantics 視為 contract，而不是實作細節。
