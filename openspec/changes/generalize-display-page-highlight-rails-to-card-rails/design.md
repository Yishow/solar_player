## Context

目前 Sustainability 的 highlight rail 只是一個固定容器加四個 item 陣列，前台渲染直接假設每個 item 只有 value、unit、label，display page draft/live config 也因此只知道這種單一結構。這讓未來任何新敘事卡都必須在 page-local config、runtime render 與 publishing validation 中額外開特例，既無法共用，也會讓 editor 與 runtime 對同一塊區域看到不同資料形狀。

這個 change 的責任不是直接交付 4 口之家內容或 editor 拖拉能力，而是先把 highlight rail 升級成可共用的 card rail contract。只有先把持久化 schema、runtime renderer 與 publish-time safety model 抽象好，後續的 household-equivalent template 與 editor card authoring 才能在同一套資料模型上疊加。

## Goals / Non-Goals

**Goals:**

- 將固定四格 highlight 結構抽象成可共用的 card rail schema，讓 display page 可以保存多張模板化卡片。
- 讓 runtime 透過模板 resolver 渲染 rail 卡片，而不是直接依賴 page-local item shape。
- 讓既有四格 highlight 正式成為 metric-highlight template，保留當前畫面能力與 seed data 相容性。
- 讓 draft/live publishing 與 layout safety guards 理解 card rail 與子卡片 frame，避免新 schema 無法被安全保存與發布。

**Non-Goals:**

- 不在本 change 內新增 household-equivalent 的計算公式、四口之家口徑或 Sustainability 的預設敘事卡內容。
- 不在本 change 內新增 editor 的新增、刪除、複製、模板切換或拖拉卡片 UI。
- 不把整個 display page config 擴張成任意自由版面編排器，也不新增巢狀容器。
- 不改變既有 hero、KPI card、stat card、page chrome、rotation 或 publish history 的 contract。

## Decisions

### Store card rails as explicit template-tagged config records

每個可支援 rail 的 display page config SHALL 以獨立 cardRail record 保存 rail 容器與 cards 陣列；每張卡都帶有 template、visible、displayOrder、frame、stylePreset 與 contentSource。這比把新欄位繼續塞進既有 highlightRail.items 更穩，因為 template 與 frame 屬於 durable contract，而不是臨時顯示技巧。

替代方案是繼續沿用 item 陣列，再針對某些 item 額外掛 template-specific 欄位。這會讓 schema 在沒有明確 discrimination 的前提下繼續膨脹，後續 editor 與 validation 很難判定哪些欄位何時必填，因此不採用。

### Keep metric-highlight as a first-class compatibility template

既有四格 highlight 不會只在 migration 階段被動轉換一次，而是會被定義為正式的 metric-highlight template。這樣 runtime、seed config 與後續 editor 都只需要理解模板化卡片，不需要維護「舊 highlight 特例」與「新 rail 卡片」兩條渲染路徑。

替代方案是用一次性 migration 把舊 highlight item 轉成新 schema，然後 runtime 只保留新模板。這會讓既有 seed/config render tests 與操作者心智失去舊摘要卡的正式身份，未來若要切回摘要卡又要重新造型，因此不採用。

### Validate rail cards through publish-time card rail safety rules

publish-time validation SHALL 新增 rail-aware safety 規則：子卡片 frame 必須落在 rail 容器內、template-required 欄位不得缺漏、visible card 不得保存成無法渲染的空模板。這些規則屬於 display page publishing contract，而不是 editor-only 提示，因為 card rail 最終仍要在 live playback route 上安全顯示。

替代方案是只在 editor 端做本地檢查，server publish route 完全信任輸入。這會讓未來任何非 editor 入口或 stale draft 都有機會把無效 rail 發到 live，因此不採用。

### Reuse the shared display page persistence channel instead of a new rail store

card rail 不會有獨立資料表或獨立 route；它 SHALL 跟其他 display page config 一樣走既有 draft/live channel、publish history 與 config envelope。這保持 display page registry、preview、runtime refresh 與 publishing semantics 不變，只擴張 page config 的內容模型。

替代方案是為 rail 額外做一套 page-adjacent API 或資料來源。那會讓同一頁的 layout 資料被拆成多份真相來源，並破壞既有 publish/reset/diff workflow，因此不採用。

## Implementation Contract

- **Behavior**: 支援 card rail 的 display page SHALL 能把 rail 容器與模板化卡片一起保存到 draft config，preview 與 playback SHALL 透過同一份模板 resolver 渲染。既有四格 highlight SHALL 能以 metric-highlight template 繼續呈現，不因 schema 升級而消失。
- **Interface / data shape**: 共用 display page config SHALL 定義 cardRail record，至少包含 container geometry 與 cards 陣列。每張 card SHALL 具有可判別 template 的欄位、獨立 frame、顯示狀態、排序資訊，以及可被後續模板擴張的 content source shape。server publish 與讀取路徑 SHALL 接受此新 schema，且 unknown template 或缺漏必填欄位不得被視為合法 live config。
- **Failure modes**: 若 draft 中存在 frame 超出 rail 邊界、visible card 缺少模板必填欄位、或 template key 無法解析，publish SHALL 回傳 blocking validation findings；preview/runtime 在讀到無效或未知 template 時 SHALL 回退到 seed baseline 或隱藏該 card，而不是讓整頁 crash。
- **Acceptance criteria**:
  - `spectra validate --strict --changes generalize-display-page-highlight-rails-to-card-rails` 通過。
  - 共用 config 型別、server publish route 與 Sustainability runtime render tests 可證明 card rail schema 已進入 draft/live contract。
  - 既有摘要卡 seed config 能以 metric-highlight template 呈現，且 config render tests 明確讀取 card rail cards 而不是舊 item array。
  - publish validation tests 可覆蓋 rail card 越界與缺欄位案例。
- **Scope boundaries**:
  - In scope: shared config schema、template-tagged rail cards、metric-highlight 相容模板、server publish/read validation、Sustainability runtime 消費新 card rail schema。
  - Out of scope: household-equivalent 公式與內容、editor card CRUD/drag/resize UI、多個 rail region、跨頁實際導入。

## Risks / Trade-offs

- [Risk] 新 schema 讓既有 page config tests 大量漂移。 → Mitigation: 保留 metric-highlight 作為正式模板，讓既有 highlight seed 能透過明確 mapping 過渡。
- [Risk] publish validation 若只看卡片 frame 而不看模板必填欄位，live config 仍可能保存成無法渲染狀態。 → Mitigation: safety rules 同時檢查 geometry 與 template contract。
- [Risk] 只先在 Sustainability 接新 schema，其他頁暫未導入，可能形成短期混合狀態。 → Mitigation: 將 card rail contract 放在 shared 層，並明確限制第一個 consumer 是 Sustainability，而不是 page-local 私有型別。
