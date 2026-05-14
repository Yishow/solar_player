## Context

shared FHD shell 與 playback shell boundary 已另外用 foundation change 處理，所以下一個合理步驟不是再碰 root shell，而是把最適合 playback canvas 的 display surface pages 真正遷移到 reference page body composition。根據 `docs/reference-match/all-pages-audit.md`，這一批最明顯的共通點是：它們大多不是高風險 CRUD / save/test pages，主要 drift 集中在 hero、flow、chart、media、summary panel 與 dense information staging。這使得它們適合作為「view-layer 優先」的遷移批次。

本 change 的困難不在資料來源，而在每頁都已經有自己的 hook、viewModel、mock/fallback 與 route contract。若在遷移時順手改 service 或 hook，scope 就會失控，也會讓 regression 難以定位。因此這一批必須採 page-local layout constants + asset mapping + JSX composition 的策略，只動 view layer 與必要的 view-model display fields。

## Goals / Non-Goals

**Goals:**

- 遷移 `/overview`、`/solar`、`/images`、`/trends`、`/history`、`/slideshow-preview`、`/device-status` 的 page body，使其接近各自 reference HTML/CSS。
- 讓這 7 頁改用 shared playback canvas shell，而不再把 `PageScaffold` title block 當作主要 display layout。
- 為每頁建立 page-local layout constants 與 asset mapping，避免 left/top/width/height 散落在 JSX。
- 保留現有 hook、viewModel、fallback 與 route/data contract。

**Non-Goals:**

- 不處理任何 settings-form page。
- 不修改 backend、socket、playback controller、device action API 或 image service contract。
- 不在本 change 內回頭重做 shared shell host。
- 不承諾所有頁面一步到位 pixel-perfect，只要求 major composition、asset usage 與 visual hierarchy 對齊。

## Decisions

### Use page-local layout modules for every in-scope display route

決策：每一個 in-scope route 都建立或更新 page-local layout module，例如 `overviewLayout.ts`、`solarLayout.ts`、`energyTrendLayout.ts`，把 reference geometry、region IDs、asset keys 與 shell metadata 集中管理。

理由：這一批頁面都有大量 reference px constants。若直接散落在 JSX 中，後續微調會非常痛苦，也不利於 reviewer 直接對照 reference CSS。

替代方案：
- 把所有 layout constants 收進一個超大的全域檔。拒絕原因：頁面彼此 layout 差異大，會讓 constants 管理失焦。
- 直接把 constants 寫在 JSX。拒絕原因：最難維護。

### Preserve view-model boundaries and only add display-facing fields when needed

決策：保留各 page 現有的 hook 與 viewModel；若 reference migration 需要 icon key、asset key、region label 或 display state，優先在 page viewModel 增加 display-facing fields，而不是讓 JSX 重新讀 raw service data。

理由：這一批路由已各自有 fallback 邏輯。若把 fallback 分支拆回 JSX，reference migration 會讓每頁 render tree 充滿資料條件分支。

替代方案：
- 讓 page JSX 直接決定 fallback 與 icon mapping。拒絕原因：會造成 view logic 爆炸。

### Group display routes by visual composition family inside one change without touching settings pages

決策：這個 change 雖包含 7 頁，但內部分三個 composition family 實作：hero/KPI pages (`/overview`, `/solar`, `/images`)、dense chart/data pages (`/trends`, `/history`)、status/preview pages (`/slideshow-preview`, `/device-status`)。

理由：雖然 scope 比單頁大，但這些頁面的風險主要仍在 display composition，且都能建立在同一個 playback shell foundation 之上；與 settings-form pages 混在一起才是真正過寬。

替代方案：
- 每頁一個 change。拒絕原因：拆得太碎，會重複建立相同的 shared display primitives 與驗證方式。
- 把 settings pages 一起納入。拒絕原因：會把高風險互動 regression 引入此 batch。

## Implementation Contract

**Behavior**

- 7 條 in-scope routes 渲染後，page body 需接近對應 reference HTML/CSS 的 major composition，並透過 shared playback shell 呈現。
- 這些頁面不再以 dashboard `PageScaffold` title block 作為主要 display body 的版型起點。
- 每頁 major regions、asset usage、title group、hero/chart/media/summary staging 應可從 page-local layout constants 與 asset mapping 追溯。

**Interface / data shape**

- `useLiveMetrics()`、各 page existing viewModels、`usePageRotation()`、`requestJson()`、device status fetch 與其他 route-level hooks 保持原本 contract。
- 若需要新 display fields，只能作為 view-model 輸出補充，例如 `iconKey`、`assetKey`、`statusTone`、`layoutRegionId` 等；不得反向改 service payload。
- shared playback shell 元件與 reference visual primitives 由前一輪 foundation 提供，本 change 僅消費它們。

**Failure modes**

- 若某頁 reference 資產不存在，該頁必須退回既有 mock/fallback presentation，而不是硬接新 API。
- 若某頁仍透過 `PageScaffold` title block 駕馭主體版型，則視為未完成 route migration。
- 若 view migration 導致 hook/viewModel/fallback contract 被繞過或複製，視為 regression 風險過高。

**Acceptance criteria**

- `pnpm --filter @solar-display/web build` 成功。
- 人工對照 7 個 reference HTML/CSS，確認 major composition 從 grid/card dashboard 模型轉成 page-specific playback/display canvas 模型。
- Code review 可確認每頁已有 page-local layout constants、asset mapping 與 preserved hook/viewModel boundary。

**Scope boundaries**

- In scope：上述 7 條 routes 的 page body、layout constants、asset mapping、display-facing viewModel fields、shared reference primitive props。
- Out of scope：settings pages、backend/service contract、shared shell host foundation、global CSS 污染、new API integration。

## Risks / Trade-offs

- [7 頁仍有一定規模] → 以 composition family 拆 task，並明確排除 settings pages。
- [缺 page-artifacts 的頁面資產不足] → 允許使用既有 mock/fallback 或 generated preview assets，不新增 API。
- [部分頁面其實偏 management，例如 `/history`、`/device-status`] → 僅處理其 display surface composition，不碰互動核心與管理 contract。
- [若 foundation change 未先落地，這一批仍可能回退到 scaffold] → 在 tasks 中明定 shared shell 必須是前置條件。
