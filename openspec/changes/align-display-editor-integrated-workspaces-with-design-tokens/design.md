## Context

這一輪整合已經把 `/settings/assets` 與 `/shell-decorations/editor` 的主要工作流帶回 `/display-pages/editor`，但 UI 還停在過渡態：editor canvas card、asset workspace、shell workspace、source connection panel 之間缺乏一致的 token 語言，也缺少「我現在在哪個工作區、手上的 selection 是誰、下一步能做什麼」這種高密度操作線索。

## Goals

- 讓 display editor 與 integrated workspaces 對齊既有 semantic tokens，而不是各自用局部 hardcoded 樣式。
- 讓整合後的資產庫與殼層工作區具備實用的上下文與操作區，不再只是空頁或過渡頁。
- 保留已完成的 workflow contract，不因視覺對齊破壞 apply/return/draft preservation。

## Non-Goals

- 不在此 change 內重做整個 management shell host。
- 不新增獨立的全新 asset API 或 shell API。
- 不把 playback display pages 的 token 對齊一起拖進來；此 change 只處理 editor route 及其整合 workspace。

## Decisions

### Use semantic token roles instead of route-local styling

整合 surfaces 必須優先使用 `tokens.css` 中已有的 color, radius, shadow, spacing, input, status roles；若不足，新增的也應是 editor/workspace semantic token，而不是再塞一組 page-local hex values。

### Introduce shared workspace surface primitives

editor 自身、asset workspace、shell workspace、source connection / properties rail，應共享一套 surface primitives，例如 context board、selection detail board、sticky action bar、empty state、blocked state、workspace section heading。這能避免每個 workspace 長成不同語言的拼裝頁。

### Require practical action density inside integrated workspaces

資產庫與殼層 workspace 不是展示頁，而是操作頁。它們至少要呈現目前上下文、選取對象、可執行動作、返回路徑、blocked reason、draft state；不能只剩一個大標題和空洞內容。

## Implementation Contract

**Behavior**

- `/display-pages/editor` 在 page authoring、assets、shell 三個 workspace 間切換時，context summary 與主要 actions 保持清楚可見。
- integrated asset workspace 顯示當前替換上下文、選中素材摘要、套用並返回、restore/blocked explanation、usage detail。
- integrated shell workspace 顯示當前 shell draft、選中物件摘要、替換入口、層級/幾何/素材相關主要操作與返回 editor 入口。

**Styling**

- surface、button、border、shadow、badge、empty state、sticky actions 需收斂到 semantic tokens 或新的 editor/workspace token roles。
- 不允許新的 hardcoded `bg-[#...]`、`shadow-[...]`、`border-[...]` 成為主要樣式來源。

**Failure modes**

- 若整合 workspace 仍只剩空白標題或低資訊量 placeholder，視為未完成。
- 若對齊視覺後破壞 apply/return/draft preservation，視為重大 regression。
- 若新增樣式仍大量依賴 route-local hardcoded values，視為未對齊 contract。

## Verification

- `apps/web/src/pages/DisplayPagesEditor/index.test.tsx` 驗證 workspace context/action 狀態與回程契約。
- `apps/web/src/pages/AssetLibrary/index.test.tsx` 驗證 integrated asset workspace 的上下文與 apply/return actions。
- `apps/web/src/pages/ShellDecorationEditor/index.test.tsx` 驗證 integrated shell workspace 的 draft/selection/action state。
- code review 檢查主要 surface 是否改用 semantic tokens 或共享 primitives。

## Risks / Trade-offs

- [token 對齊做成另一次全域重構] -> scope 限制在 editor route 及其整合 workspace。
- [功能被包進漂亮容器但資訊量仍不足] -> 把 context summary、selection detail、main actions 寫進 spec 當硬需求。
- [新增 editor-specific tokens 又變另一套設計系統] -> 只允許補語義角色，不允許複製第二份 palette。
