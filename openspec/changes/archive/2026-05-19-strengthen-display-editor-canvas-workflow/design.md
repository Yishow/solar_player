## Context

現在的 display editor 只支援按 `E` 切換、點 overlay 選取區塊，再透過 inspector 手動輸入數值。當頁面區塊變多、調整更頻繁時，這種方式會大幅拖慢編輯效率，也不利於跨頁對齊和快速試調。

## Goals / Non-Goals

**Goals:**

- 補齊拖曳、縮放、鍵盤微移、zoom/pan 與 snap guides。
- 提供 region tree、鎖定與快速定位等導航能力。
- 提供 layout reuse，包括 reset、copy and paste geometry、undo and redo。

**Non-Goals:**

- 不在此 change 內補 schema-aware inspector 欄位型別。
- 不在此 change 內定義發布、審核或素材治理。
- 不在此 change 內實作新的展示頁內容模組。

## Decisions

### Manipulate geometry directly on canvas

幾何調整以直接畫布操作為主，number fields 作為輔助。這能大幅改善實際維護效率，並保留精細輸入作為補充。

### Keep region navigation separate from visual overlay

region tree 與 visual overlay 分離。overlay 保持畫布上的空間感知，region tree 負責大量區塊下的快速搜尋、切換與鎖定。

### Persist editor history per page session

undo/redo 與暫存歷史先以 page session 為單位，不立即寫入 server。這樣可讓使用者安全試調，再決定是否儲存草稿。

## Implementation Contract

- Behavior:
  - 使用者可直接在 canvas 拖曳與縮放 editable regions，並以鍵盤微移細調。
  - editor 可顯示 snap guides、zoom/pan，幫助對齊與檢視細節。
  - 使用者可透過 region tree 快速選取、鎖定與定位某個區塊。
  - 使用者可 reset、copy and paste geometry、undo and redo 當前頁 session 內的版位操作。
- Interface / data shape:
  - editor runtime 需支援 region id 到 geometry 變更事件的標準介面。
  - history model 需支援 page-scoped past and future stacks 或等價結構。
- Failure modes:
  - 不可拖曳或縮放的區塊需明示鎖定狀態。
  - 超出畫布或違反約束的操作應被阻止或夾回安全邊界。
- Acceptance criteria:
  - web tests 覆蓋快捷鍵、拖曳或 geometry 操作 reducer、undo/redo 與 region navigation。
  - 手動驗證 `/display-pages/editor` 可完成 drag, resize, nudge, zoom, reset。
- Scope boundaries:
  - in scope: canvas interaction、region navigation、session history。
  - out of scope: schema-aware field rendering、publish lifecycle、asset picker。

## Risks / Trade-offs

- [Risk] canvas interaction 狀態變複雜 → Mitigation: 抽成 interaction reducer 與 history model。
- [Risk] overlay 很多時互動混亂 → Mitigation: region tree、鎖定與 hit-area 分離。
- [Risk] undo/redo 與 server save 狀態混淆 → Mitigation: 清楚區分 session history 與 persisted draft。
