## Context

`display-editor-layout-reuse` 已經定義了 compatible-region 的 geometry copy/paste，而 `display-editor-canvas-manipulation` 已經定義 keyboard nudge；但當 editor 視覺工具變多後，這兩類高頻效率操作會更常被使用。operator 需要的不只是「能貼 geometry」，而是「知道哪些 target 相容、可否一次貼多個、可否只貼 x/y 或 width/height」；也不只是「方向鍵會動」，而是「我能以可預期的細/中/快步進微調，且 feedback 與 overlay 一致」。

這個 change 的重點不是新增全新編輯模型，而是讓既有 layout reuse 與 nudge contract 成為真的高頻工具。它應盡量復用既有 geometry compatibility 概念與 draft history，而不是發明另一套 clipboard 或指令系統。

## Goals / Non-Goals

**Goals:**

- 擴充 keyboard nudge 的步進層級與回饋，使幾何微調更精確。
- 擴充 geometry copy/paste，使相容 target、批次貼用與部分 axis 複用更可用。
- 保持所有結果仍屬於同一個 draft session 與 history stack。

**Non-Goals:**

- 不處理 snap、relational measurement 或 multi-select distribute。
- 不建立跨 session、跨 browser 或系統層級剪貼簿。
- 不把 partial paste 擴充成任意公式或 scriptable transform。

## Decisions

### Extend keyboard nudge with explicit step tiers

決策：keyboard nudge 增加至少三層步進語意，例如精細、一般、快速，並用明確修飾鍵區分，而不是把所有加速都塞進單一 `Shift` 例外。

理由：當 operator 既要微調 1px，也要快速移動數十 px 時，單層步進不夠用。明確 step tiers 比模糊的「也許按某個鍵會更快」更可預測。

替代方案：只保留既有單層與 `Shift` 加速。拒絕原因：仍不足以支撐高頻微調。

### Keep geometry reuse grounded in compatibility keys

決策：geometry copy/paste 仍以既有 compatibility key 為主，但要把相容 target 辨識、批次貼用與 partial geometry paste 建立在同一套 compatibility contract 上。

理由：compatibility key 已經是 repo 內既有語意。沿用它可避免「看起來能貼，但貼完破版」的情況。

替代方案：只要有 geometry 就允許任意貼用。拒絕原因：對不同 shape 或受限 region 風險太高。

### Treat partial paste as named geometry subsets

決策：partial geometry paste 只支援明確命名的 subset，例如 `position`, `size`, `full-frame`，而不是讓 operator 任意組合所有欄位。

理由：命名 subset 可測試、可說明，也較容易在 UI 上表達。

替代方案：提供每個欄位都可自由勾選。拒絕原因：過度細碎，且超出這個 productivity change 的必要範圍。

### Keep productivity actions inside the existing draft history contract

決策：keyboard nudge、batch geometry paste 與 partial paste 都必須整合既有 draft history，讓 undo/redo 對這些操作仍然可預測。

理由：效率工具若不能穩定 undo，實務上幾乎不能放心使用。

替代方案：把某些 batch 操作排除在 history 之外。拒絕原因：會破壞 operator 心智模型。

## Implementation Contract

**Behavior**

- operator SHALL 可以用多層級步進做 keyboard nudge，並看到與 overlay 一致的幾何回饋。
- operator SHALL 可以將 geometry 複製到相容 region，並可選擇貼用 `position`、`size` 或 `full-frame`。
- operator SHALL 可以把同一份 geometry 貼到多個相容 region，而所有結果都留在 draft history 內。
- 不相容的 region SHALL 顯示為不可貼用或被拒絕，而不是靜默產生破版結果。

**Interface / data shape**

- keyboard nudge contract 需要能表達 step tier 與對應的 design-space increment。
- geometry reuse state 需要能表達 source geometry、compatibility key、可貼用 subset 與多目標貼用結果。
- batch / partial paste actions 需要在 history 中形成可 undo 的幾何更新操作。

**Failure modes**

- 若貼用目標與 source compatibility 不符，editor SHALL 拒絕該次貼用並保留目前 draft。
- 若 batch paste 只對部分 target 有效，editor SHALL 明確回報失敗 target，而不得悄悄跳過。
- 若 step tier shortcut 無法辨識，editor SHALL 回退到預設單步 nudge。

**Acceptance criteria**

- interaction 測試需要覆蓋多層 keyboard nudge、partial paste、batch paste、不相容 target 拒絕與 history 行為。
- route/render 測試需要覆蓋相容性提示與 productivity actions 的可用條件。
- `spectra analyze extend-display-editor-layout-reuse-productivity --json` 與 `spectra validate extend-display-editor-layout-reuse-productivity` 必須可通過。

**Scope boundaries**

- In scope: multi-tier keyboard nudge、geometry compatibility cues、batch paste、partial geometry paste、history integration、測試更新。
- Out of scope: system clipboard、formula transforms、snap/measurement tools。

## Risks / Trade-offs

- [Risk] keyboard shortcut tiers 太多會提高學習成本。 → Mitigation: 保持 tiers 少而明確，並在 UI/tooltip 顯示說明。
- [Risk] batch paste 失敗情況若處理不清楚，operator 可能誤以為全部成功。 → Mitigation: 明確失敗回報與測試覆蓋。
- [Risk] partial paste 若定義不清，可能和 full-frame reuse 混淆。 → Mitigation: 只支援少數命名 subset。
