## Context

在 overlay foundation 與 relational measurement 補齊之後，editor 將能顯示更多幾何資訊，但「知道距離」不等於「能快速排整齊」。實際調版最常見的高頻操作仍然是：吸到 guide、吸到別的 block 邊界、看中心線、維持固定邊距、一次把數個 card 對齊或平均分布。若缺少這些能力，operator 仍得逐個 box 微調。

這批能力需要直接建在 design-space geometry 上，並與既有 drag/resize workflow 共存。尤其 multi-select align/distribute 若沒有清楚定義 anchor 與分布基準，apply 階段很容易做出看似方便但行為不一致的工具。

## Goals / Non-Goals

**Goals:**

- 提供 guide / region / center-line snapping 與可見的 snap 開關。
- 提供 distance lock，讓 operator 在 drag/resize 中維持指定間距或等距節奏。
- 提供 multi-select align / distribute 能力，覆蓋最常見的對齊與分布操作。
- 保持所有結果都以 design-space geometry 為準，避免 DOM pixel 偏差。

**Non-Goals:**

- 不建立持久化群組或巢狀 selection 模型。
- 不處理量尺拖把手、暫時量測模式或標籤避讓。
- 不擴充成通用設計系統編排器；只覆蓋 editor 需要的核心幾何工具。

## Decisions

### Use explicit snap targets instead of implicit nearest-neighbor heuristics

決策：snap 只會吸附到明確的 target 類型：guide、region edges、region centers、canvas center lines。operator 可透過 snap 開關與 target 類型控制是否啟用。

理由：明確 target 類型比「永遠吸最近東西」更可預測，也較容易測試與關閉。

替代方案：只要靠近任何幾何就自動吸附。拒絕原因：在密集畫面中過於黏手，且難以判斷為何吸到某個位置。

### Scope distance lock to active interaction sessions

決策：distance lock 只在當前 drag/resize session 生效，用來維持指定間距或等距節奏；session 結束後不把這個 lock 寫成長期 constraint。

理由：使用者要的是實用編輯工具，不是持久 layout constraint engine。session-scoped lock 足以支撐大多數手動排版。

替代方案：把 lock 永久寫入 region 關係。拒絕原因：會引入後續連鎖更新與更高風險。

### Define multi-select alignment around a stable bounding selection box

決策：multi-select align / distribute 以目前選取集合的 bounding box 為操作上下文。align 使用指定 edge 或 center 作為共同基準；distribute 以集合邊界與項目尺寸計算等距結果。

理由：這是最可預測也最接近常見設計工具的行為，同時不要求建立群組模型。

替代方案：以最後點選的 region 當全部操作 anchor。拒絕原因：對 distribute 來說過於隱晦，也容易讓結果偏向單一物件。

### Surface snap and alignment feedback on the canvas, not only in menus

決策：當 snap、distance lock 或 multi-select align/distribute 生效時，canvas 上需要提供足夠的可視回饋，例如中心線、snap 線或操作後的分布結果提示，而不是只在按鈕或選單層級執行。

理由：幾何工具若沒有 canvas feedback，operator 很難信任結果是否真的對齊到預期位置。

替代方案：只在 toolbar 提供命令，不顯示畫布回饋。拒絕原因：結果不透明，對排版工具來說不實用。

## Implementation Contract

**Behavior**

- operator SHALL 可以切換 snap 開關與可視中心線。
- 當 snap 開啟時，selected region 或 selected set SHALL 可吸附到 guide、region edges、region centers 或 canvas center lines。
- 當 distance lock 啟用於某次 interaction session 時，drag/resize SHALL 維持指定邊距或等距關係直到 session 結束。
- operator SHALL 可以對多個 selected regions 執行 align / distribute 命令，且結果使用 design-space geometry 計算。

**Interface / data shape**

- alignment state 需要能表達 active snap targets、snap enabled flags、distance lock session state、多選集合與 bounding selection box。
- align / distribute actions 需要明確命名操作類型，例如 left, right, h-center, v-center, h-distribute, v-distribute。
- canvas feedback 需要能表達目前哪條 guide 或 center line 成為有效 snap 參考。

**Failure modes**

- 選取集合少於 multi-select 命令所需數量時，該命令 SHALL disabled 或 no-op，不得產生部分未定義結果。
- 若 snap target 在 interaction 過程中消失，editor SHALL 回退為自由拖曳，而不是保留失效 target。
- 若 distance lock 與 boundary clamp 衝突，boundary clamp SHALL 優先，並保留可見回饋說明 lock 未完全達成。

**Acceptance criteria**

- interaction 測試需要覆蓋 snap 到 guide / region / center line、distance lock、boundary clamp 優先級、多選對齊與等距分布。
- route/render 測試需要覆蓋 snap 開關、center-line 顯示、多選工具可用條件與 disabled state。
- `spectra analyze add-display-editor-alignment-and-snap-toolkit --json` 與 `spectra validate add-display-editor-alignment-and-snap-toolkit` 必須可通過。

**Scope boundaries**

- In scope: snap toggles、center lines、distance lock、multi-select align / distribute、canvas feedback、測試更新。
- Out of scope: persistent groups、relational rulers、overlay preset memory、geometry clipboard。

## Risks / Trade-offs

- [Risk] snap target 太多會讓拖曳體感過於黏。 → Mitigation: snap 類型可切換，且只對明確 target 生效。
- [Risk] multi-select distribute 在不同尺寸 card 上可能不符合直覺。 → Mitigation: 明確以 bounding selection box 與各項尺寸計算結果，並補測試案例。
- [Risk] distance lock 與邊界 clamp 互相衝突。 → Mitigation: 明定 boundary clamp 優先，並保留可見回饋。
