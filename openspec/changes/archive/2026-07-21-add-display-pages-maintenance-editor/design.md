## Context

目前五個 display 頁面都已經各自完成 reference-aligned playback runtime，但它們的可調參數仍散落在 page-local layout constants、asset mapping、view-model 文案與 CSS 中。這些值對工程師是可控的，對營運或設計維護者則不友善：每次要調整 slogan、背景圖、hero 位置、cards、nodes、connectors、thumb grid 或 highlight rail，都需要進 code。

同時，這個 repo 已有明確的 shell split：`DisplayCanvas` 對 playback/display routes，`ManagementShell` 對 management/settings routes。若把 editor overlay 與快捷鍵直接常駐到正式播放 route，會把 editor state 與 playback runtime 混在一起；若只做傳統表單式後台，又會讓維護者在數字欄位與實際畫面之間反覆切換。

因此本 change 的設計方向是：建立獨立的 display page editor route，讓維護者在 management shell 內進入頁面畫布式 editor，直接在各組件上看到選取與對應 UI，再經由 inspector 調整 shared fields 與 page-specific regions。由於五頁結構差異很大，實作必須分 phase 進行，先把 foundation 做穩，再依頁面型態擴展。

## Goals / Non-Goals

**Goals:**

- 建立覆蓋 5 個 display 頁面的 display page editor 規畫與 contract。
- 建立 shared editor foundation：editor route、page switcher、`E` 鍵切換、selection overlay、inspector、save/reload/fallback。
- 建立 shared persisted config envelope，容納 shared fields 與 page-specific region descriptors。
- 讓五個正式 display routes 都能在各自 phase 完成後，讀取 persisted config 而保留既有 playback、offline 與 live metric/fallback 行為。
- 把五頁拆成明確 phased rollout，讓 apply 可以一步一步完成，而不是一次硬推完整 generic editor。

**Non-Goals:**

- 不在第一個 implementation step 同時完成五頁的所有 page-specific editor。
- 不提供任意 selector/CSS 字串編輯器。
- 不把 editor overlay 常駐在正式播放 route。
- 不改變既有播放排程、MQTT、offline 導頁或 live metrics service contract。

## Decisions

### Keep the editor interaction inside a dedicated management route, not the production playback routes

決策：editor 互動只存在於獨立 display page editor route，掛在 `ManagementShell` 下；正式 `/overview`、`/solar`、`/factory-circuit`、`/images`、`/sustainability` routes 不常駐 editor overlay。

理由：這樣可以把 editor state、快捷鍵、選取框、儲存失敗狀態與正式播放顯示隔離，避免影響 runtime shell 與 route contracts。

替代方案：
- 直接在正式 display routes 上支援 `E` 編輯。拒絕原因：播放與編輯責任混雜，維護與測試風險高。
- 只做傳統後台表單。拒絕原因：無法滿足「在頁面上直接看到對應組件 UI」的需求。

### Phase the display-page editor rollout by page family rather than implementing all five pages at once

決策：同一個 change 內明確規畫所有五頁，但 apply tasks 必須以 phase 順序落地：foundation → overview → solar → factory-circuit → images → sustainability。

理由：五頁差異很大。`overview`、`solar`、`sustainability` 共享較多 hero/KPI 類型，`factory-circuit` 有 nodes/connectors/load rows，`images` 則是 media stage + thumb grid。若一開始就要求同一種 generic editor 同時吃下五頁，第一輪很容易失控。

替代方案：
- 一次完成五頁。拒絕原因：scope 過大，難以保證每一頁的 editor interaction 與 config contract 都穩定。
- 只規畫 overview。拒絕原因：不符合這次要求要把五頁全部納入同一份規畫。

### Model display-page component editing with a shared config envelope plus page-specific region descriptors

決策：資料模型分兩層：
- shared config envelope：page id、editability metadata、save state、shared copy/asset/layout groups
- page-specific region descriptors：例如 `overview.heroTitle`、`solar.flowNodes.inverter`、`factoryCircuit.loadRows[0]`、`images.thumbs[2]`、`sustainability.highlightRail`

理由：shared envelope 可以支撐 editor shell、page switcher 與通用 inspector；page-specific region descriptors 則讓每頁保留自己的形狀，而不是硬被壓成最低公分母。

替代方案：
- 單一 generic JSON blob。拒絕原因：欄位驗證與 editor UX 不清楚。
- 直接暴露 CSS selector 與 raw style strings。拒絕原因：太難維護，也不利於 fallback/migration。

### Apply persisted page config through prepared display models while preserving playback contracts

決策：每個 display route 在 render 前都先把 persisted config 與現有 seed/default values 合成 prepared display model，再交由頁面 render。editor persistence 不直接散落在 JSX。

理由：這樣可以把 fallback、migration、page-local adapter 與 runtime metrics mapping 集中起來，避免 editor state 滲入 page body。

替代方案：
- JSX 內直接判斷 persisted config 與 defaults。拒絕原因：頁面會越來越難維護，也不利於五頁 rollout。

## Implementation Contract

完成本 change 後，系統要滿足以下可觀察行為：

1. 管理者可以從 management shell 進入新的 display page editor route，並在其中切換五個 display 頁面。
2. editor route 內按 `E` SHALL 切換 edit mode；edit mode 開啟時，當前頁面的可編輯區塊會顯示選取狀態與對應 inspector。
3. 系統 SHALL 提供 shared persisted config envelope，並針對五頁提供 page-specific editable regions：
   - `Overview`: slogan 三段、hero 背景圖、hero 容器、KPI cards
   - `Solar`: slogan/title、hero、flow nodes、connectors、KPI cards
   - `Factory Circuit`: title/copy/status、nodes、connectors、load rows
   - `Images`: title/copy、main media、info panel、thumb grid、arrows
   - `Sustainability`: title/copy、hero、KPI/stat cards、highlight rail
4. 每個頁面的 config 都可以被儲存並再次載入；若 persisted config 缺失、欄位不完整或讀取失敗，系統 MUST 回退到既有 seed/default values。
5. 正式 display routes 在各自 phase 完成後 SHALL 套用 persisted config，但 MUST 保留既有 playback shell、offline redirect、route rotation 與 live metric/fallback contract。
6. apply 階段 MUST 依 phase 順序完成，而不是跳過 foundation 直接實作後段 page-specific editors。

資料與介面契約：

- server SHALL 提供 display page config 的讀取與更新 API。
- shared schema SHALL 命名頁面與 region ids，不接受任意 raw CSS 作為主要設定格式。
- editor route SHALL 區分 editor UI state（selected region、edit mode、dirty/save/error）與 persisted page config。

失敗模式：

- 若 config 載入失敗，editor route 必須顯示清楚的 fallback 或錯誤狀態，而不是空畫面。
- 若 config 儲存失敗，dirty state 與錯誤訊息必須保留。
- 若 runtime 無法取得 persisted config，display route 仍必須使用 seed/default values 正常播放。

驗收方式：

- `pnpm --filter @solar-display/web build`
- 各頁 targeted tests 與 server config route tests
- 手動驗證：editor route page switcher、`E` 鍵切換、各 phase 已完成頁面的區塊選取與儲存、刷新後重新載入、正式 display route 套用結果

範圍邊界：

- In scope：五頁 editor 規畫、foundation、shared config envelope、逐頁 phased rollout、五頁 runtime 套用 contract。
- Out of scope：generic freeform drag-and-drop design tool、system settings 併入 display editor、任意 CSS/raw style 編輯器。

## Risks / Trade-offs

- [五頁一起規畫但 apply 漂成一次做完] → 在 specs 與 tasks 明確要求 phased rollout，並把 page families 分組驗證。
- [shared schema 過度 generic 化] → 使用 page-specific region descriptors，讓每頁保有自己的資料形狀。
- [editor route 與正式 runtime 漂移] → 以 prepared display models 與 seed-backed fallback 集中 mapping。
- [images/factory-circuit 的 page-specific UI 太特別] → 先在 design 與 tasks 中給出專屬 phase，不要求第一輪共用完全相同的 inspector 控件。
