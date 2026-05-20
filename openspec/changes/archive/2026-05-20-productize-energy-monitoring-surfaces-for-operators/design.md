## Context

`Energy Trend` 與 `Energy History` 已有資料抓取與基礎畫面，但頁面仍偏向 prototype-like 展示：freshness 只以文字輕描淡寫，來源角色不清，empty/error/degraded state 也沒有形成 operator workflow。這讓頁面雖然看得到數字，卻不容易判斷數字是否足以支撐營運決策。

## Goals / Non-Goals

**Goals**

- 讓 monitoring surfaces 明確顯示 freshness、source role、與 degraded state。
- 對齊 `Energy Trend` 與 `Energy History` 的 empty/error semantics。
- 讓兩頁更像 operator monitoring surface，而不只是靜態視覺化。

**Non-Goals**

- 不重做整體視覺設計。
- 不導入新的 analytics backend。

## Decisions

### Make freshness and source state explicit on monitoring surfaces

每個 monitoring surface 都應明確說明目前是 live、history、cumulative、stale、還是 partial data，而不是只用單一句子模糊帶過。operator 最需要的是可信度訊號，而不是更多裝飾文字。

### Normalize empty and degraded monitoring states across trend and history

`Energy Trend` 與 `Energy History` 應使用一致的 degraded/empty/error 語意，讓使用者在兩頁之間切換時不必重新學一套狀態系統。

## Implementation Contract

- Behavior: `Energy Trend` 與 `Energy History` SHALL 明確揭露資料來源角色、更新鮮度、與 degraded/empty/error state，而不是只在一般文案中弱化帶過。
- Interface / data shape: 兩頁的 view model SHALL 產出可被 UI 直接使用的 freshness / source / empty-state semantics。
- Failure modes: 若 live、history、或 cumulative 來源其中之一缺失，頁面可顯示 partial/degraded，但不得假裝成完全 fresh 的正常狀態。
- Acceptance criteria: `apps/web/src/pages/EnergyTrend/viewModel.test.ts` 與 `apps/web/src/pages/EnergyHistory/viewModel.test.ts` SHALL 覆蓋 fresh、stale、empty、error、partial-data 等狀態輸出。
- Scope boundaries: 本 change 只產品化 monitoring surfaces 的 operator workflow，不處理新的 BI 指標或跨系統分析。

## Risks / Trade-offs

- [Risk] 狀態訊息變多讓畫面更密 → Mitigation: 把 freshness/source/degraded 訊息濃縮成固定區塊，不增加新的主視覺層級。
- [Risk] partial-data 邏輯不一致 → Mitigation: 讓兩頁共用相同語意集合。
