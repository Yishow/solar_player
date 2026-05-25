## Context

shared shell decoration authoring 與 display page authoring 很像，都需要 FHD 預覽、物件選取、排序、鎖定與 draft/publish；但 shell config 的 ownership 是全站共用，不屬於任何一個 `templateKey` 或 `pageId`。若直接把它塞進現有 `DisplayPagesEditor` 的 page switcher，operator 會把 shared shell 與 page-local content 混在一起理解，也會讓 save/publish 邊界變得模糊。

因此這個 change 採用獨立的 shell authoring surface，但重用既有 editor 的 canvas 與 selection patterns，避免平行長出第二套互動模型。

## Goals / Non-Goals

**Goals:**

- 提供可實際操作的 shell decoration editor，編輯 header/footer 共用物件。
- 讓 operator 用物件列表而不是只能靠 canvas 點選小裝飾物件。
- 提供排序、鎖定、顯隱、刪除與 mount-aware add flow。
- 讓 shell decoration draft/save/publish 與單頁 display page draft/publish 分離。

**Non-Goals:**

- 不在這個 change 內新增 page-level freeform object editor。
- 不在這個 change 內新增文字物件、群組、mask 或動畫。
- 不在這個 change 內提供完整資產庫管理頁。
- 不在這個 change 內重新設計 management shell 的全站導覽結構。

## Decisions

### Reuse editor canvas primitives on a dedicated shell authoring surface

shell editor SHALL 使用獨立 route 或獨立 management surface，但重用既有 editor 的 FHD canvas、selection feedback 與 draft interaction patterns。這可保留熟悉的操作方式，同時避免 page selector 與 shared shell ownership 混淆。

替代方案是把 shell 編輯塞進 `DisplayPagesEditor` 的頁面切換器。這雖然看似重用更多 UI，但會讓 shared shell config 假裝成某一頁，增加心智負擔。

### Model shell objects as header/footer scoped list items instead of page regions

shell objects SHALL 以 `header` / `footer` scoped object list 管理，而不是假裝成 page regions。這讓新增物件、切換 mount、排序與可見性控制更直接，也不需要為 shell 裝飾硬塞 page region schema。

替代方案是用 page region tree 表示 shell objects。那會把「可編輯內容區塊」與「殼層裝飾物件」混為同一種節點。

### Keep object list as the primary selection surface for crowded shell decorations

在 shell decorations 場景下，細線與小 ornament 很常因尺寸太小而難點。第一波 editor SHALL 把 object list 當作主要選取入口，canvas 點選是輔助。這能確保 layer、lock、visibility 等操作可穩定落在正確物件上。

替代方案是以 canvas 直接點選為主。那在 header/footer 擁擠時會反覆出現誤選。

### Draft and publish shared shell decorations independently from display pages

shell decoration save/publish SHALL 使用 shared shell config 自己的 draft/live lifecycle，而不是借用任一 display page 的保存流程。這能避免改 shell 線條時誤觸發 page publish，也避免 page draft reload 影響 shared shell。

替代方案是把 shell authoring 綁進任一頁面 publish。那會讓變更範圍與審核邊界不清楚。

## Implementation Contract

**Behavior**

- operator 可在 dedicated shell editor 中新增、選取、刪除 `line`、`asset-image`、`ornament-image` 物件。
- object list 依 `header` / `footer` 顯示，支援直接選取、前後層排序、鎖定與顯隱。
- 預覽區以 FHD shell 顯示 shared shell decorations，且 save/publish 只影響 shared shell config。
- shell editor 的 draft/save/publish 不會覆寫任一 display page draft。

**Interface / data shape**

- shell editor 讀寫 shared shell decoration draft contract，而不是 page config contract。
- object list row 至少暴露：label、type、mount、visible、locked、z-order controls、delete action。
- add flow 至少允許選擇 `header` / `footer` mount 與三種支援 object type。
- publish status、dirty state 與 validation findings 需以 shell config 為單位顯示。

**Failure modes**

- invalid draft 資料仍可在 editor 內被看見與修正，但 publish SHALL 被 validation findings 阻擋。
- 若 shell draft 讀取失敗，editor 應顯示 shared shell 層級的錯誤，而不是 page editor 的 generic fallback。
- 若 asset 無法解析，object row 與預覽都要保留診斷狀態，不可靜默吞掉讓 operator 不知道哪個物件失敗。

**Acceptance criteria**

- route-level tests 可驗證 shell editor 讀寫 shared shell draft，而非 page draft。
- object list tests 可驗證 select、reorder、lock、hide、delete 與 mount grouping。
- `pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` 通過。
- `spectra validate --strict --changes add-shared-shell-decoration-editor` 通過。

**Scope boundaries**

- In scope: dedicated shell authoring surface、object list、shell draft/publish、selection/reorder/lock/hide。
- Out of scope: page freeform objects、文字物件、asset library management page。

## Risks / Trade-offs

- [風險] 新增獨立 shell editor route 會讓 management surface 再多一頁。 → Mitigation：重用現有 editor patterns，避免新增另一套完全陌生 UI。
- [風險] shell objects 若只靠 object list 編輯，canvas 的直接操作感較弱。 → Mitigation：第一波以穩定選取為優先，canvas 直接拖曳可留給後續增量。
- [風險] shell 與 page publish 若 UI 文案不清楚，operator 可能誤會變更範圍。 → Mitigation：shell editor 明確標示 shared shell draft/publish 狀態與影響範圍。
