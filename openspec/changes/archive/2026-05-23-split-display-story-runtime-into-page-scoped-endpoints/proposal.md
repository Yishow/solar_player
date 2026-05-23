## Summary

把目前一次回傳 `overview`、`solar`、`factory-circuit` 全部 payload 的 `/api/display-story`，拆成 page-scoped runtime endpoint 與對應 service 讀取器，讓每個監控頁面只抓自己需要的 story payload，同時保留相容過渡。

## Motivation

現在 `apps/server/src/routes/display-story.ts` 只有單一 aggregate endpoint，而 `useDisplayStoryRuntime` 不論當前頁面是哪一頁，都必須先抓整包 story 再抽出對應 payload。這讓 server 端的 `displayStoryService` 持續維持單體讀取函式，也讓前端 runtime refresh 在單頁 invalidation 下仍耦合到其他頁的 payload 計算，後續若要做 page-local runtime contract 或逐頁調試會持續卡在同一個 aggregate boundary。

## Proposed Solution

- 新增 page-scoped display story runtime capability，定義 `overview`、`solar`、`factory-circuit` 各自的 API 入口與 payload wrapper。
- 將 server `displayStoryService` 拆成 page-local reader，再由 aggregate route 視需要組回舊格式，避免所有 consumers 一次切換。
- 更新 web `useDisplayStoryRuntime` / API helper，讓監控頁 runtime 直接抓對應 page payload，而不是先抓整包 aggregate story。
- 補上 route 與 hook 測試，確認 page-scoped endpoint 不回傳不相關 payload，且 aggregate route 在過渡期間仍保持原樣。

## Non-Goals

- 不更動 `overview`、`solar`、`factory-circuit` story semantics、fallback rule 或 KPI 計算方式。
- 不把 `sustainability`、`images` 或其他 runtime source 併入這個 endpoint family。
- 不在本 change 移除 `/api/display-story`；先保留 compatibility shim，等所有 consumers 遷移完再另案處理。

## Impact

- Affected specs: `page-scoped-display-story-runtime`
- Affected code:
  - Modified:
    - `apps/server/src/routes/display-story.ts`
    - `apps/server/src/routes/display-story.test.ts`
    - `apps/server/src/services/displayStoryService.ts`
    - `apps/web/src/services/api.ts`
    - `apps/web/src/hooks/useDisplayStoryRuntime.ts`
    - `packages/shared/src/displayStory.ts`
  - New:
    - `openspec/changes/split-display-story-runtime-into-page-scoped-endpoints/specs/page-scoped-display-story-runtime/spec.md`
  - Removed:
    - (none)
