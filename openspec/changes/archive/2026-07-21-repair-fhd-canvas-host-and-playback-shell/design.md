## Context

全站 audit 已經把問題壓縮得很清楚：current app 的 14 條 route 雖然都對應到 reference prototype，但主要 drift 不是單頁少了裝飾，而是共用 shell 與 page scaffold 先把所有頁面導向 `PageScaffold + grid/card` 模型。`apps/web/src/layouts/LayoutShell.tsx` 目前仍是 header、scrollable main、footer 的 flex stack；`apps/web/src/pages/shared/PageScaffold.tsx` 與 `apps/web/src/components/PageContainer.tsx` 則把 route body 預設成 management-style title block + content stack。這個骨架一旦不改，後續任何 page-specific 對位都會繼續 dashboard 化。

這次 change 要刻意保持很窄。它不是 14 頁 rollout，也不是 `/solar` 專案內頁重做。它只修兩件事：shared shell host 必須真正採用 reference-style `1920x1080` canvas + viewport scaling；playback shell 必須從 management scaffold 拆開。其餘逐頁 absolute composition、asset binding、page-specific KPI/flow/chart/table 對位，全部留給後續 change。

## Goals / Non-Goals

**Goals:**

- 把 root shell 從 centered container 改成 fixed `1920x1080` internal canvas host。
- 讓 playback route 可以使用 playback-only shell primitive 或 title-group contract，而不是被 `PageScaffold` title/description block 綁住。
- 保留 management routes 使用 `PageScaffold` / `PageContainer` 的能力，但縮小它們的責任邊界。
- 用一條 playback witness route 與一條 management witness route 驗證 shared shell host 與 shell split 生效。

**Non-Goals:**

- 不在這個 change 內完成任何 route 的 full reference page composition。
- 不調整 backend、socket、MQTT、route order、offline contract、playback contract。
- 不在這個 change 內處理 page-specific generated assets、page-artifacts、icon binding 或 hero photo binding。
- 不把 14 頁 mapping、phase gating 或 rollout evidence 再重做一遍。

## Decisions

### Introduce a real DisplayCanvas host at the root shell layer

決策：在 `LayoutShell` 層引入真正的 `DisplayCanvas` 或等價 host，負責 `1920x1080` internal surface、viewport scaling、overflow clipping 與 shell chrome 掛載，而不是讓 route content 直接進入 `max-w-[var(--screen-width)]` 的 flex container。

理由：只改 page body 而不改 root host，最後仍會受到 scrollable main、centered container、utility spacing 的約束，reference-style absolute page composition 很難成立。

替代方案：
- 僅在個別 playback page 內建立 1920x1080 容器。拒絕原因：會造成多種殼層並存，header/footer 與 page body scaling 無法一致。
- 只調整 CSS variables，不新增 host 元件。拒絕原因：無法明確承接 viewport scaling 與 clipping contract。

### Split playback shell from PageScaffold instead of overloading one scaffold

決策：`PageScaffold` 保留給 management-style pages；playback pages 另有 playback title-group / shell primitive 路徑，不再把 `PageScaffold` 同時當作 management scaffold 與 playback shell。

理由：audit 已證明 `PageScaffold` 是全站 dashboardization 的主要來源。若只是再加一個 `playback` variant 到同一個 title block，後續很容易又把 playback page body 拉回 description-first layout。

替代方案：
- 讓 `PageScaffold` 支援更多 density 與 title variants。拒絕原因：責任過度集中，且不利於明確建立「playback body 不等於 management body」的邊界。

### Use witness routes only for shell verification, not page completion

決策：只選一條 playback witness route 與一條 management witness route 驗證 shared shell host 與 shell split；這兩條 route 的用途是驗證新殼層可被掛載，不等於要在本 change 完成 full reference page alignment。

理由：若 witness route 被寫成 page-complete requirement，scope 會立刻回到逐頁改版。這與本 change 要求的「不可太寬」直接衝突。

替代方案：
- 不設 witness route。拒絕原因：殼層重構若沒有真實 route 驗證，很容易停在抽象元件層而沒有可觀察結果。
- 用兩條 playback route 當 witness。拒絕原因：缺少 management scaffold 的回歸驗證。

## Implementation Contract

**Behavior**

- Root shell 必須提供 reference-style `1920x1080` internal canvas host，並透過 viewport scaling 呈現，而不是讓 route content 成為可滾動的 app page stack。
- playback witness route 渲染後，page body 不再依賴 management-style `PageScaffold` title/subtitle/description block 作為主要內容骨架。
- management witness route 渲染後，仍可使用 `PageScaffold` / `PageContainer` 家族，不因 playback shell split 被迫改成 playback title group。

**Interface / data shape**

- `LayoutShell` 仍負責 route outlet、offline redirect、playback rotation hook 與 shared header/footer 掛載；本 change 不改這些 runtime source 的 API shape。
- `PageScaffold` 的責任縮限為 management-style page container；playback shell primitive 則提供給 playback page 使用，不要求共用同一套 title-body contract。
- 新增的 `DisplayCanvas` 或等價 host 元件，必須明確承接 design size、scaling、overflow clipping 與 shell children。

**Failure modes**

- 若只改 CSS 而沒有新的 canvas host，route content 仍會被 scrollable main 與 max-width container 牽制，視為未達成 contract。
- 若 playback shell 仍透過 `PageScaffold` title block 注入主體結構，則全站仍會繼續 dashboard 化，視為未達成 contract。
- 若為了 split shell 而破壞 management page 的 title block、page number、footer navigation，視為 regression。

**Acceptance criteria**

- `pnpm --filter @solar-display/web build` 成功。
- 人工檢查一條 playback witness route 與一條 management witness route，確認兩者共用同一個 root canvas host，但 page-body shell boundary 已分開。
- Code review 可確認 `LayoutShell` 不再只是 centered scrollable container，且 `PageScaffold` 不再被當作 playback page 的唯一殼層入口。

**Scope boundaries**

- In scope：`LayoutShell`、`AppHeader`、`AppFooterNav`、`PageScaffold`、`PageContainer`、`TitleBlock`、新增 canvas host、新增 playback shell primitive、witness route 掛載。
- Out of scope：page-specific absolute layout、page-specific asset binding、逐頁 composition、data mapping refactor、backend 或 route contract 變更。

## Risks / Trade-offs

- [shell host 與 scaffold split 仍可能被實作者順手擴成逐頁改版] → 在 tasks 與 spec 明寫 witness-only scope，禁止把 page-complete alignment 混入本 change。
- [新增 playback shell primitive 可能與 management scaffold 重疊] → 明確限制兩者職責，一個處理 playback page body shell，一個處理 management page title/content scaffold。
- [root canvas host 可能影響現有 header/footer 或 offline flow] → 保留 `LayoutShell` 的 routing/offline/rotation 責任，只替換 host 幾何模型。
- [witness route 選太多會膨脹 scope] → 限定一條 playback route 與一條 management route 即可。
