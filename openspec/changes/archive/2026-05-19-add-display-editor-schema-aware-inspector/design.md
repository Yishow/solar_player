## Context

目前每個頁面的 editable region fields 都在 runtime 中手寫，只有 text 與 number 兩種欄位。隨著素材引用、toggle、enum、arrays、preset 與 reset 需求增加，這種手寫欄位列表會快速失控，也難以保證不同頁面的編輯體驗一致。

## Goals / Non-Goals

**Goals:**

- 提供 typed inspector controls，支援多種欄位型別與約束。
- 提供 reset and diff tools，顯示 seed/live 差異並能快速回復。
- 提供 region presets，讓重複結構可重用。

**Non-Goals:**

- 不在此 change 內實作畫布拖曳縮放。
- 不在此 change 內實作 publish lifecycle 或 asset health reporting。
- 不在此 change 內新增新的展示頁故事模組。

## Decisions

### Describe region fields with a schema-aware inspector contract

各頁 region 欄位改由 schema 描述，包含欄位型別、約束、預設值、分組與可否 reset。runtime 依 schema 渲染 inspector，而不是每頁手寫欄位 JSX。

### Compute reset and diff tools against seed and current draft state

reset and diff tools 先以 seed 與當前 draft 比較為主，若有 live state 可再顯示三方差異。這能讓編輯者先快速理解自己改了什麼，再決定是否回復。

### Keep region presets opt-in and scoped by compatibility

preset 只在相容結構間可用，例如同一類 KPI card 或同一類 copy block，避免把不相容欄位強行套用到不同區塊。

## Implementation Contract

- Behavior:
  - inspector 可依 schema 渲染 text, number, toggle, select, array item, asset reference 等欄位。
  - inspector 可顯示欄位約束錯誤、seed 差異與 reset 動作。
  - 相容 region 可套用 preset 或整組欄位模板。
- Interface / data shape:
  - shared schema 至少支援 `fieldType`, `path`, `label`, `constraints`, `group`, `resettable`, `presetKey` 或等價欄位。
- Failure modes:
  - 未知欄位型別需以安全 fallback 顯示，而不是讓 inspector 整體失效。
  - preset 套用到不相容 region 時需回傳明確錯誤或禁用動作。
- Acceptance criteria:
  - web tests 覆蓋 typed field rendering、reset and diff tools 與 preset compatibility。
  - 手動驗證 editor inspector 能處理多種欄位型別並保留一致互動。
- Scope boundaries:
  - in scope: schema-aware fields、diff、reset、presets。
  - out of scope: canvas interactions、publish lifecycle、rotation plan。

## Risks / Trade-offs

- [Risk] schema 設計過複雜 → Mitigation: 先涵蓋實際需要的欄位型別，再逐步擴充。
- [Risk] preset 誤用造成大幅覆寫 → Mitigation: 限制 compatibility 並提供預覽或確認。
- [Risk] diff 資訊太多干擾編輯 → Mitigation: 先聚焦 field-level dirty 與 reset 標記。
