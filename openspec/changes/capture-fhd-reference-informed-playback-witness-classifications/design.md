## Context

`fhd-reference-informed-closeout-boundaries` 已經定義三種 classification token：`protected-product-choice`、`reference-quality-target`、`actual-gap`。下一步不是直接 tuning，而是先取得新鮮 witness，讓後續 changes 的 scope 由證據決定。

目前五頁 launch matrix 仍應維持 blocked，因為 classification 只能解釋 visual rationale，不能替代 runtime parity、publish refresh、fallback 與 handoff gate。

## Goals / Non-Goals

**Goals:**

- 產出五頁 fresh playback/editor witness batch。
- 用固定 boundary decision table 記錄每個重要 reference mismatch。
- 明確保護 header/footer accepted shell attributes。
- 為後續 Overview/Solar、Factory Circuit、Images、Sustainability closeout changes 提供可引用輸入。
- 用 focused tests 保護 evidence bundle 與 launch matrix 的分類語彙。

**Non-Goals:**

- 不改任何 runtime pixels、CSS、layout seed、editor control、server API。
- 不宣稱五頁任一頁 launch-ready。
- 不解決 Images playlist/fallback 或 Sustainability ring/media actual gap；只分類並記錄。

## Decisions

### Capture Before Tuning

本 change 只跑 witness capture 和分類。任何 visual tuning 都延後到 page-specific changes。這能避免沒有 fresh evidence 時憑印象調值，也能保護使用者已接受的 shell choice。

### Boundary Table Is The Handoff Contract

輸出文件使用同一個欄位順序：Surface、Classification、Current Product Choice、Reference Quality Cue、Protected Attributes、Implementation Consequence、Witness Evidence、Accepted By、Revisit Trigger。後續 page closeout changes 必須引用這份 table，不重新發明分類語彙。

### Launch Matrix Remains Blocked Unless Gates Pass

即使某些 shell differences 被分類為 `protected-product-choice`，五頁 overall status 仍保持 `blocked`，直到各自 runtime parity、publish refresh、fallback、handoff gates 都通過。

## Implementation Contract

**Observable behavior:**

- Reviewer 可以在一份 dated boundary classification 文件中看到五頁所有主要 reference mismatch 的分類。
- Launch matrix 能引用 classification rationale，但不把 classification 當成 launch status。
- 後續 tuning changes 有明確 input：哪些 shell attributes 要保護，哪些 page content 是 quality target，哪些缺口要另拆或阻塞。

**Interface / data shape:**

- Classification tokens 固定為 `protected-product-choice`、`reference-quality-target`、`actual-gap`。
- Boundary table 欄位固定為 Surface、Classification、Current Product Choice、Reference Quality Cue、Protected Attributes、Implementation Consequence、Witness Evidence、Accepted By、Revisit Trigger。
- Witness evidence 必須包含 route、reference image、playback screenshot path、editor preview screenshot path 或明確 blocker。

**Failure modes:**

- 若 capture command 無法執行，文件必須記錄 blocker，且相關 route classification 只能標為 `actual-gap` 或 blocked evidence，不得猜測。
- 若 Accepted By 缺失，該 `protected-product-choice` 不能解除 visual fail。
- 若 launch matrix status 被改為 pass 但缺 gate evidence，該 change 不合格。

**Acceptance criteria:**

- Focused docs/tests 能檢查 classification tokens、boundary table fields、launch matrix blocked status。
- `spectra analyze capture-fhd-reference-informed-playback-witness-classifications --json` 無 Critical/Warning。
- `spectra validate capture-fhd-reference-informed-playback-witness-classifications --strict` 通過。

**Scope boundaries:**

- In scope：witness capture evidence、classification doc、matrix rationale、docs/tests。
- Out of scope：page tuning、runtime data fixes、editor schema expansion、asset generation。

## Risks / Trade-offs

- [Risk] witness capture 被環境擋住 → Mitigation：記錄具體 blocker，不用舊圖猜 pass/fail。
- [Risk] classification 過度保護 shell → Mitigation：Protected Attributes 必須具體列出，page content 另列。
- [Risk] 後續 change 跳過分類輸入 → Mitigation：page closeout tasks 必須先讀這份 boundary classification。
