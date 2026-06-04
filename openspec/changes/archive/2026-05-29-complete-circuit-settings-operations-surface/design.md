## Context

`Circuit Settings` 已經承接 slot binding、threshold ranges、display visibility、readiness feedback 與 bulk save，但整個頁面仍高度偏向 raw table editing。從畫面與資料流來看，operators 真正在意的是「這筆迴路會影響哪個 display slot」「目前 threshold 是否合理」「這筆 dirty 變更風險有多高」「圖示/單位是否會把 display primitive 搞壞」，而不是單純把每一格值填滿。

## Goals / Non-Goals

**Goals:**

- 補齊 `Circuit Settings` 作為 bulk governance workspace 的可讀性與風險提示。
- 保留 table-first、高密度、bulk editing workflow。
- 讓 slot binding、validation、threshold semantics、icon presentation 都有更有邊界的 authoring contract。

**Non-Goals:**

- 不把這頁拆成逐欄位 wizard 或多步驟表單。
- 不重寫 circuit backend model，除非是支援 bounded authoring 所需的最小型 metadata。
- 不把 circuit authoring 延伸成新的 visual editor。

## Decisions

### Preserve bulk table editing as the primary interaction

這頁最有價值的能力就是一次看很多列並進行 bulk edits，因此設計不會放棄 table-first 模式。改動重點是把 row summary、validation、display impact 與 risk cues 補到 table shell 裡，而不是把工作流拆散。

### Replace freeform icon authoring with bounded circuit presentation choices

目前 icon 以自由文字輸入，這對 display primitive 來說邊界太弱。新的設計會把 icon/unit 類型收斂為 bounded choices 或至少帶 validation 的 authoring interaction，避免任意字串直接變成 runtime 顯示語義。

### Promote row-level display impact and threshold risk summaries

operators 需要在每一列就看懂 slot binding 是否完整、threshold 是否合理、dirty change 會影響哪個 display slot 或 warning state。這些資訊不能只藏在小 caption 或狀態 pill 裡，而要成為 row-level summary contract。

## Implementation Contract

**Behavior**

- `Circuit Settings` SHALL 保持 bulk table editing，但 row-level surface SHALL 顯式呈現 display impact、validation、dirty risk 與 threshold semantics。
- icon/unit editing SHALL 具有更有邊界的 authoring contract，避免不受控的 display presentation drift。
- readiness summary SHALL 與 row-level slot binding state 互相對應，讓 operators 能從 summary 追到受影響的 rows。

**Interface / data shape**

- circuit row data SHALL 表示 display slot binding、validation tone, threshold range summary, dirty summary, and bounded presentation choice state.
- page summary data SHALL 能回報 total/visible/dirty/capacity/readiness 與對應 row-level impact。

**Failure modes**

- 若 table 仍只提供 raw cell editing，無法快速看出 row risk 與 display impact，視為未完成。
- 若 icon authoring 仍完全依賴自由文字且無 validation 邊界，視為未完成。
- 若 token alignment 犧牲 bulk editing 速度，導致 row 操作被埋在過深 interaction 中，視為 regression。

**Acceptance criteria**

- circuit tests 能驗證 row summary、slot validation、dirty risk 與 bounded presentation choices。
- manual review 能直接回答「這筆設定影響哪個 slot」「目前哪列有風險」「threshold 是否完整」「為什麼這列不能算 ready」。

**Scope boundaries**

- 本 change 聚焦 circuit governance surface，不擴大到新的 route 或 visual editor。
- bulk save、inline editing、slot binding contract 仍維持現有工作模式。

## Risks / Trade-offs

- [bounded icon choices 被認為不夠彈性] → 允許擴充 choice set，但不允許完全無邊界的 display primitive 輸入。
- [加入太多 row summary 造成表格更擁擠] → 把最關鍵的 impact/risk 收斂為 compact summary，不在每列攤平過多次級資訊。
- [summary 與 row detail 斷裂] → 明確要求 readiness summary 可對應到 row-level impact。
