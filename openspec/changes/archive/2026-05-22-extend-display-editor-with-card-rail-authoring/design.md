## Context

目前 `Display Pages Editor` 對 Sustainability highlight rail 的 authoring 仍停留在單一 region 加 array 欄位：操作者只能在 inspector 內編幾個 item 的 label/value/unit，無法把 rail 內卡片當成可選取、可排序、可拖拉、可切模板的實體。只要 card rail schema 一旦改成模板化卡片，這種 array-only 編輯方式就無法支撐營運實際需求，也會迫使新模板繼續繞回 page-local 特例。

這個 change 要把 editor 升級成「card rail 內卡片是 first-class authoring item」的模式，但仍限制在 card rail region 內操作。它依賴 card rail schema 與 household-equivalent template 已存在，卻不嘗試把整個 display editor 擴張成全自由 page builder。

## Goals / Non-Goals

**Goals:**

- 讓 card rail 卡片在 editor 中成為可選取、可排序、可切模板、可拖拉與可縮放的第一級 authoring item。
- 讓導覽樹、canvas 與 inspector 對同一張 rail 卡有一致的選取與 draft 綁定模型。
- 讓不同卡片模板透過 typed inspector fields 暴露正確欄位，而不是要求操作者編原始 array/json shape。
- 讓所有 rail card 操作維持既有 draft session、save/reset/publish workflow 與 geometry history 約束。

**Non-Goals:**

- 不把整頁變成任意元件自由編排器，也不允許 rail 外的任意 floating node。
- 不支援多層巢狀容器、跨 region 拖放或任意富文字排版。
- 不在本 change 內新增新的卡片模板語意，僅消費已存在模板。
- 不變更既有 page-level hero/KPI/stat region 的編排模型。

## Decisions

### Model rail cards as selectable child authoring nodes

card rail SHALL 在 editor state 中擁有自己的 region node，且 rail 內每張卡都會被建成可選取的 child authoring node。這讓 region tree、canvas selection 與 inspector 都可以用同一套選取模型處理 rail cards，而不是把整條 rail 視為單一 blob。

替代方案是保留單一 rail region，只在 inspector 內做 list reorder 與 field editing。這無法支援 direct manipulation，也會讓 canvas 上的卡片與導覽樹完全不同步，因此不採用。

### Separate card lifecycle commands from template field editing

新增、刪除、複製、顯示開關、排序與模板切換 SHALL 作為 card lifecycle 操作，和模板欄位編輯分開處理。前者改變 rail cards 集合與 identity，後者只改選中卡片的內容與 frame。這樣 history、undo 與 dirty diff 較容易維持穩定語意。

替代方案是把 lifecycle 操作塞進同一組 array field editor。這會讓 identity 與內容編輯交織，難以對 drag/resize/history 建立可預期行為，因此不採用。

### Constrain rail card geometry inside the parent rail bounds

rail card 的 drag/resize SHALL 套用 parent rail bounds，且沿用既有 geometry history/draft session 進行更新。卡片不允許被拖到 rail 容器外，也不允許跨 region 轉移。這保留了 card rail authoring 的自由度，同時不讓它演變成任意版面編排器。

替代方案是允許卡片像一般 region 一樣在整個 page canvas 任意移動。這會直接打破 rail container 的語意，也會讓 publish validation 與 operator 心智失控，因此不採用。

### Use template-specific inspector schemas instead of raw array editing

每張 rail card SHALL 依 template key 生成 typed inspector fields，例如 `metric-highlight` 暴露 value/unit/label，`household-equivalent` 暴露 eyebrow/household count/supporting line/disclaimer。操作者編輯的是具名欄位與受約束的 frame，而不是一段無型別 array payload。

替代方案是維持 array editor，讓 template-specific 欄位嵌在 item object 裡。這會讓 inspector 難以提供清楚的欄位驗證與模板切換 UX，因此不採用。

## Implementation Contract

- **Behavior**: 在支援 card rail 的 display page 上，operator SHALL 能從 region tree 或 canvas 選到個別 rail card，並執行新增、刪除、複製、顯示開關、排序、模板切換、drag 與 resize。這些變更 SHALL 保留在目前 draft session，preview SHALL 立即反映。
- **Interface / data shape**: editor runtime SHALL 把 rail container 與其 child cards 轉成可選取的 authoring nodes。每張 rail card SHALL 有 stable id、template key、frame、visibility、display order 與 template-specific field schema。inspector SHALL 依 template key 渲染對應 typed controls；canvas interaction SHALL 對 child card frame 寫回 draft config，而非直接改 DOM-only transient state。
- **Failure modes**: 若 template key 不支援，editor SHALL 顯示不可編輯或 fallback state，而不是崩潰；若 drag/resize 會超出 rail bounds，editor SHALL clamp 或拒絕操作；若 lifecycle 操作產生不合法 payload，draft validation SHALL 標記問題並保留可恢復狀態。
- **Acceptance criteria**:
  - `spectra validate --strict --changes extend-display-editor-with-card-rail-authoring` 通過。
  - editor tests 可證明 rail cards 出現在 region tree、inspector 與 canvas selection 中。
  - drag/resize tests 可證明 rail cards 受 parent rail bounds 約束且變更寫回 current draft session。
  - template switch tests 可證明 inspector fields 會隨 card template 改變。
- **Scope boundaries**:
  - In scope: card rail child nodes、card lifecycle actions、rail-bounded canvas manipulation、template-aware inspector fields、navigation integration、draft/history binding。
  - Out of scope: 多層容器、rail 外自由元件、跨 page 通用 page-builder、其他 page-level authoring 模型重寫。

## Risks / Trade-offs

- [Risk] rail cards 成為 child nodes 後，editor state 可能比現有 region model 更複雜。 → Mitigation: 只在支援 card rail 的 region 下啟用 child node 模式，其他 region 維持原狀。
- [Risk] lifecycle 與 drag/resize 同時引入，容易讓 history/undo 邏輯退化。 → Mitigation: 明確拆分 lifecycle commands 與 template field editing，並以既有 draft session/history 為唯一寫入管道。
- [Risk] inspector 欄位過多會讓模板切換 UX 混亂。 → Mitigation: 依 template key 產生精簡 schema，未支援模板只顯示 fallback state，而不嘗試無條件編輯所有欄位。
