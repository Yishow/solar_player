## Context

上一輪性能回歸修正已處理三個具體問題：Solar / Sustainability staged loading return 的 hooks order 風險、scoped no-op dirty history、live preview catalog request key 與 sync listener 穩定性。這個 change 不再擴 production 行為，而是把兩個最容易回歸的性能防線改成更耐用的測試合約。

現況限制：
- Web 測試使用 `node --import tsx --test` 與 root/package filter scripts。
- 本 repo 目前沒有 lint script；驗證以 targeted tests、web build、web test、`git diff --check` 為準。
- `pnpm --filter @solar-display/web test` 在受限 sandbox 可能因 tsx IPC 權限失敗，需要在允許權限後重跑完整測試。

## Goals / Non-Goals

**Goals:**

- 用單一跨頁測試覆蓋五個 playback runtime page 的 staged loading hooks order guard。
- 用純資料行為測試確認 requested page key set 相同時，visible-window 順序抖動不會被視為新 catalog request。
- 保持 production 變更最小；若能以測試與既有 helper 完成，不新增 runtime abstraction。

**Non-Goals:**

- 不處理 bundle chunk splitting 或 dynamic import。
- 不新增瀏覽器/Playwright witness gate。
- 不重寫 `useDisplaySyncRefresh`、socket subscription、catalog loader 的資料流。
- 不修改 display page runtime 視覺輸出。

## Decisions

### Centralize playback hook-order guard in one cross-page contract test

上一輪在 Solar / Sustainability 各自補 source-contract test。後續若其他 playback page 加入 staged loading return，page-local test 容易漏掉。因此新增一個跨頁測試，掃描五個 playback runtime entry source，確認每個 `return <DisplayPageLoadingState />;` 到主要 JSX return 之間沒有新的 React hook call。

Alternative considered：保留每頁各自測試並靠 code review 補齊。拒絕原因是同一規則散在不同檔案，未來新增/移動 return 時容易漏補。

### Keep preview request-window stability as a pure helper contract

`resolvePreviewCatalogRequestKey` 已經把 requested page keys 排序去重。這輪只補強它的行為測試，使用不同順序、重複項、不同 set 的 cases，確認它表達的是「請求集合」而不是 carousel 畫面順序。這避免為了測 hook 生命週期引入新的 React testing dependency 或自製 renderer。

Alternative considered：新增 hook-level mount/rerender 測試，直接計數 loader 呼叫與 socket subscription。拒絕原因是目前 repo 沒有 hook testing harness；為單一 guard 新增測試基礎設施會超出本 change 的最小必要範圍。

## Implementation Contract

- Behavior: 五個 playback runtime page 在 staged loading return 之前必須完成所有 React hook calls；測試失敗時要指出具體 page 與 return 區段違規。
- Behavior: live preview catalog 的 requested-window request key 必須對同一組 page keys 穩定，不受順序或重複項影響；不同 page key set 必須產生不同 key。
- Interface / data shape: `resolvePreviewCatalogRequestKey(pageKeys: readonly string[])` 保持既有 export 與回傳 `string`，不得改成會影響 loader consumer 的新資料結構。
- Acceptance criteria:
  - `node --import tsx --test src/pages/displayRuntimeHookOrder.test.ts` passes。
  - `node --import tsx --test src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts` passes。
  - `pnpm --filter @solar-display/web build` passes。
  - `pnpm --filter @solar-display/web test` passes。
  - `git diff --check` passes。
- Scope boundaries: 本 change 只允許新增/調整測試與必要的小型 test helper/pure helper coverage；不得改動 runtime rendering、socket subscription protocol、API contract 或 chunk splitting。

## Risks / Trade-offs

- [Risk] Source-contract test 仍不是 browser runtime reproduction。→ Mitigation：只用它守 React hooks ordering 這類靜態結構風險，並保留完整 web test/build gate。
- [Risk] Pure helper test 不能直接證明 React effect 沒有重跑。→ Mitigation：本 change 明確把 observable contract 收在 request key stability；hook-level subscription instrumentation 留給獨立測試基礎設施 change。
- [Risk] 跨頁 source scanner 過度耦合 JSX return 文字。→ Mitigation：只掃描 `DisplayPageLoadingState` 到主要 `return (` 的區段，失敗訊息要求 reviewer 檢查 hook placement，而不是綁定行號。
