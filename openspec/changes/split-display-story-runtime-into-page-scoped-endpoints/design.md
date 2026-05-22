## Context

`display-story` 目前是單一路由 `GET /api/display-story`，由 `readDisplayStory()` 一次組出 `overview`、`solar`、`factoryCircuit` 三份 payload。前端 `useDisplayStoryRuntime(pageKey)` 雖然只會消費其中一頁，仍必須先抓整包 aggregate payload 再做 page-local extraction。這讓 server 端 service 與 web hook 都持續耦合在單體 route 上，對 page-local invalidation、逐頁調試與未來 page-specific runtime endpoint 擴充都不友善。

這個 change 的目標不是改變 story 內容，而是把 runtime API boundary 切成 page-scoped，並保留 aggregate route 作為相容過渡。

## Goals / Non-Goals

**Goals:**

- 為 `overview`、`solar`、`factory-circuit` 建立 page-scoped display story runtime endpoint。
- 將 `displayStoryService` 拆成 page-local reader，讓 aggregate route 可以由 page readers 組裝而成。
- 更新 web runtime hook，使每個監控頁只抓自己的 story payload。

**Non-Goals:**

- 不變更任何監控 story 的計算邏輯、fallback rule、KPI schema 或 freshness semantics。
- 不把 `sustainability`、`images` 或其他非 `display-story` source 合併到這組 endpoint。
- 不在本 change 移除既有 aggregate route 或要求所有既有 consumer 一次升級完成。

## Decisions

### Expose page-scoped display story routes alongside the aggregate endpoint

server SHALL 新增 `GET /api/display-story/:pageId`，支援 `overview`、`solar`、`factory-circuit` 三個 page key，並回傳 page-scoped payload wrapper。既有 `GET /api/display-story` 仍保留，作為 compatibility shim。這讓新舊 consumer 可以並存，降低一次切換風險。

替代方案是直接移除 aggregate route。這會把 change 擴大成一次性 breaking migration，也讓現有 consumer 難以逐步驗證，因此排除。

### Split displayStoryService into page readers with shared snapshot reuse

`displayStoryService` SHALL 拆成可獨立呼叫的 page readers，但它們仍共用同一次 metrics snapshot 與 circuits query context，避免 aggregate route 在組裝三頁 payload 時重複讀取資料。這讓 service 邏輯的切分與效能都能維持穩定。

替代方案是保留單體 `readDisplayStory()`，只在 route 層切 payload。這無法真正降低 service 的耦合度，也無法讓 page-scoped route 以清晰 contract 被單獨測試，因此排除。

### Switch useDisplayStoryRuntime to page-local payload fetches

web `useDisplayStoryRuntime(pageKey)` SHALL 改成呼叫對應的 page-scoped API helper，直接接收該頁 payload，而不是先抓 aggregate story 再切片。hook 的外部回傳 shape 保持不變，讓頁面元件不需要一起重寫。

替代方案是只新增 server route、不更新 hook。那會讓實際 runtime 仍持續依賴 aggregate endpoint，無法把 API boundary 改動真正落到使用路徑上，因此排除。

## Implementation Contract

- Behavior: `overview`、`solar`、`factory-circuit` 各自能透過 `GET /api/display-story/:pageId` 取得 page-scoped runtime payload；web monitoring pages 只抓自己的 page payload；既有 `GET /api/display-story` 仍可回傳與現況等價的 aggregate story。
- Interface / data shape:
  - `GET /api/display-story/:pageId` 回傳 `{ generatedAt, pageId, payload }`，其中 `payload` 為該 page 既有 story shape。
  - `GET /api/display-story` 仍回傳 aggregate shape `{ generatedAt, overview, solar, factoryCircuit }`。
  - `useDisplayStoryRuntime("overview" | "solar" | "factory-circuit")` 對呼叫端維持既有 `payload`, `errorMessage`, `isLoading`, `usesFallback` 等 hook surface。
- Failure modes: 不支援的 `pageId` 由 route 以既有 API error conventions 回應；單頁 endpoint failure 不應強迫 client 解析其他頁 payload 作為 fallback。
- Acceptance criteria:
  - server route tests 覆蓋 page endpoint 只回傳單頁 payload，以及 aggregate route compatibility。
  - web tests 覆蓋 `useDisplayStoryRuntime` 會呼叫 page-local API helper，而非 aggregate fetch。
  - `pnpm --filter @solar-display/server test` 與 `pnpm --filter @solar-display/web test` 通過。
- Scope boundaries: 本 change 只切 display story runtime API 邊界與相應 hook/service；不修改監控 story 的 business semantics，也不移除 aggregate route。

## Risks / Trade-offs

- [Risk] 新增 page-scoped wrapper 會讓 aggregate 與 page routes 暫時並存兩種 API shape。 → Mitigation：在 artifact 明確記錄 wrapper shape，並保留 aggregate route 只作 compatibility 用途。
- [Risk] 若 page readers 各自重新讀資料，aggregate route 可能在同一次請求內出現 snapshot 不一致。 → Mitigation：拆 service 時共用同一次 metrics/circuits context，再由 aggregate route 組裝。
- [Risk] client hook 切到 page-local fetch 後，若 route naming 不穩定，後續 runtime invalidation 測試會難維護。 → Mitigation：以 `pageKey` 為單一來源定義 API helper 與 route mapping，避免多處硬編碼。
