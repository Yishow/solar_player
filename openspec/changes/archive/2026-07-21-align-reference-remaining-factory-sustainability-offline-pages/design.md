## Context

shared FHD shell、playback display pages 與 settings/management pages 的主要 alignment 已在前幾輪完成；目前 `docs/reference-match/all-pages-checklist.md` 只剩 `/factory-circuit`、`/sustainability`、`/offline` 三頁是 `partial`。這三頁雖然都屬播放/展示鏈的一部分，但風險類型不同：`/factory-circuit` 是 flow-heavy diagram page、`/sustainability` 是 storytelling + KPI page、`/offline` 是 runtime-sensitive error surface。新的 change 必須保持很窄，只補這三頁，不重開 shared shell 或 settings pages。

目前 codebase 已經有可複用的 pattern：page-local `layout.ts`、`*.css`、asset mapping、display-facing view-model fields，以及 `DisplayCanvas` / `AppHeader` / `AppFooterNav` 提供的共用 shell。這表示這一輪不需要再建立新架構，而是讓三頁回到相同的遷移模型。

## Goals / Non-Goals

**Goals:**

- 把 `/factory-circuit`、`/sustainability`、`/offline` 從舊的 `PageScaffold + dashboard/grid` body 改成接近 reference HTML/CSS 的 FHD composition。
- 為三頁建立 page-local layout constants、必要 asset mapping 與 route-local CSS。
- 保留既有 `viewModel`、hook、fallback、retry、returnTo、circuits API 載入與 empty-state contract。
- 更新 audit/checklist，讓全站 reference-match closeout 能反映這三頁的新狀態。

**Non-Goals:**

- 不修改 shared shell host、header/footer 實作與 route rotation contract。
- 不改 backend API、socket service、MQTT contract、circuits API shape 或 reconnect 行為。
- 不導入新的 screenshot framework 或大型 QA tooling。
- 不追求三頁一次到位 pixel-perfect，只要求 major composition、asset usage、fallback 與互動契約正確。

## Decisions

### Reuse the existing reference page migration pattern instead of inventing a new page host

決策：三頁都延續既有 migrated pages 的模式，使用 page-local `layout.ts`、page CSS、asset mapping 與 `<section className=\"...-display-page\">` body，而不是重新引入新的 page host 或把 layout constants 寫回 shared shell。

理由：shared shell 已穩定；再新增 host 只會讓最後三頁走成第二套 reference implementation。

替代方案：
- 直接把 reference CSS 全域貼進 `global.css`。拒絕原因：會污染已完成頁面。
- 繼續用 `PageScaffold` 配 Tailwind grid 微調。拒絕原因：這三頁之所以仍是 `partial`，就是因為主體 composition 沒脫離 dashboard 模型。

### Centralize display-facing icon and asset keys in view models and layout modules

決策：`/factory-circuit` 的 flow nodes、load rows、KPI cards 改由 view-model 輸出 `iconKey` / `statusTone` 類 display fields；`/sustainability` 與 `/offline` 的 hero/background assets 由 `assets.ts` 或 `layout.ts` 管理，不在 JSX 內散落 import 與 magic numbers。

理由：這三頁都需要從 emoji/card 風格轉到 reference glyph/raster 風格，但資料來源與 fallback 邏輯必須保留。把 display 映射集中，才能只改 view layer。

替代方案：
- 在 JSX 裡直接用 `if/else` 決定 icon 與 fallback。拒絕原因：review 很難看出 contract 是否被保留。

### Treat Offline as a playback-style error surface while preserving reconnect contract

決策：`/offline` 雖然 `routeMeta` 仍標為 management shell 群組，但 body composition 直接對齊 reference playback-style error surface；既有 `useMqttStatus()`、countdown、retry、connected 後自動返回與備援導頁保持不變。

理由：reference `12-offline-error-display.html` 本來就是單獨的 display-like error page，真正風險在 reconnect contract，不在 shell group 標籤。

替代方案：
- 把 `/offline` 保留成管理頁 panel。拒絕原因：與 reference drift 最大。
- 順手改 `routeMeta` 讓 `/offline` 完全轉成 playback group。拒絕原因：會波及 offline routing 與 rotation scope，不屬本 change。

## Implementation Contract

**Behavior**

- `/factory-circuit` SHALL 呈現 reference-like title group、copy block、gold/leaf ornaments、三個 flow nodes、routing connector、六個 load rows 與五個 KPI cards，且不再使用 `PageScaffold` title block 作為主體版面。
- `/sustainability` SHALL 呈現 reference-like title group、story copy、hero media、三個 compact KPI cards、三個 stat cards 與 highlight row，並維持既有 summary/fallback 文案來源。
- `/offline` SHALL 呈現 reference-like right-side media background、centered offline panel、error detail rows、retry bar 與現有 retry/return actions，且當 MQTT 恢復連線時仍自動返回原頁。

**Interface / data shape**

- `buildFactoryCircuitViewModel()`、`buildSustainabilityViewModel()`、`buildOfflineErrorViewModel()` 可以新增 display-facing fields，但不得改變現有 route 消費的資料來源 contract。
- `useLiveMetrics()`、`useMqttStatus()`、`requestJson("/api/circuits")`、`getSocketClient().connect()`、`navigate(returnTo)` 的呼叫契約保持不變。
- page-local `layout.ts` 必須集中 major region geometry；若使用資產，`assets.ts` 必須集中 import 與用途映射。

**Failure modes**

- 若 `/api/circuits` 失敗或回傳空資料，`/factory-circuit` 必須仍保留完整 diagram/load/KPI 骨架與 empty-state fallback。
- 若 `/sustainability` 缺少 asset 或 summary，畫面必須退回現有 provisional image 與 readable KPI/stat placeholders，而不是 render broken image 或空白區塊。
- 若 `/offline` 缺 timestamp 或 reason，viewModel 既有 placeholder copy 必須仍可顯示；retry 計時與手動重試不可失效。

**Acceptance criteria**

- `pnpm --filter @solar-display/web exec tsx --test src/pages/FactoryCircuit/viewModel.test.ts src/pages/Sustainability/viewModel.test.ts src/pages/OfflineError/viewModel.test.ts` 成功。
- `pnpm --filter @solar-display/web build` 成功。
- `docs/reference-match/all-pages-checklist.md` 中三頁不再是 `partial`。
- code review 可確認三頁都有 page-local layout constants 與 route-local CSS，且沒有再依賴 `PageScaffold` title block 作為主體。

**Scope boundaries**

- In scope：三頁 page body JSX、layout constants、asset mapping、display-facing view-model fields、route-local tests 與 reference-match docs。
- Out of scope：shared shell foundation、settings pages、routeMeta group 調整、backend contract、formal screenshot framework。

## Risks / Trade-offs

- [最後三頁的 reference 結構差異很大] → 以 page-local layout/constants 處理，不抽過度通用 abstraction。
- [FactoryCircuit 仍有資料/閾值風險] → 只改 display-facing mapping，不重寫 circuits runtime 與 threshold logic。
- [Offline 頁面具有真實 reconnect 副作用] → 保持 effect 與 handler 流程不變，只重排 body composition。
- [Checklist 可能與實作不同步] → 同一個 change 內更新 audit/checklist，避免 closeout 文件繼續陳舊。
