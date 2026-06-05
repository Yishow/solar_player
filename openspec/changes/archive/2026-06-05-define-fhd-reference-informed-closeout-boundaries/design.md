## Context

現行 repo 已經有三層 FHD closeout 機制：

- `ai-frontend-fhd-evidence-workflow` 要求 AI-authored frontend changes 提供 evidence bundle。
- `display-surface-visual-guardrails` 要求 playback visual changes 參考 visual review checklist，並記錄 intentional deviation。
- `display-launch-witness-gates` 要求五個 playback 頁在 launch witness matrix 中逐頁記錄 authoring coverage、runtime parity、publish refresh、fallback behavior 與 handoff readiness。

這些機制能避免無證據地宣稱完成，但目前沒有定義「reference mismatch」的決策分類。結果是兩種風險會同時存在：第一，後續 FHD polish 可能把 header/footer 高度、位置等使用者已覺得好的產品選擇誤改成 prototype-like pixel match；第二，團隊也可能把真正影響展示質感的頁面 gap 用一句 intentional deviation 帶過。

本 change 要補的是 closeout 判斷語彙與 evidence contract，不是開始調整五個頁面的 CSS、layout config、seed data 或 editor schema。

## Goals / Non-Goals

**Goals:**

- 定義 FHD reference difference 的三種分類：protected product choice、reference quality target、actual gap。
- 讓 header/footer 高度、位置、資訊密度這類已接受的 shell 差異可以被正式保護，但保護範圍必須可審查、可重新檢視。
- 讓五個 playback 頁的後續 closeout 能把 page content polish 仍然往 reference 質感推進，例如 Overview hero/KPI、Solar flow、Factory circuit、Images media stage、Sustainability ring/highlight rail。
- 讓 evidence bundle、visual checklist、launch matrix 與 editor gap ledger 使用同一套分類，避免四份文件各自維護不同狀態語彙。
- 提供可測試的文件 contract，使現有 web tests 能檢查模板與 checklist 是否包含必要欄位與分類語彙。

**Non-Goals:**

- 不調整 `/overview`、`/solar`、`/factory-circuit`、`/images`、`/sustainability` 的 runtime 畫面。
- 不改 header/footer CSS、LayoutShell、AppFooterNav、display shell decoration 或 route host 行為。
- 不新增 editor control、shared schema、server validation、seed migration 或 runtime renderer logic。
- 不建立 screenshot-diff threshold、不新增 Playwright visual regression service、不把 reference PNG 改成硬性 pixel-match baseline。
- 不重新啟用 prototype HTML、不把 `docs/reference/kuozui-green-fhd-html-prototype/` 當作 runtime source of truth。
- 不把任何五頁 launch gate 標為 pass；這個 change 只定義後續判斷方式。

## Decisions

### Classify Reference Differences Before Tuning

每個重要 reference difference 在進入五頁 tuning 前都必須先被分類：

- `protected-product-choice`：目前產品版本被明確接受，雖與 reference 不同但不應在 closeout 中被追齊。必須記錄 surface、protected attributes、接受理由、witness evidence、review owner 與 revisit trigger。
- `reference-quality-target`：reference 提供質感方向，但不要求幾何、字級、位置或圖片裁切逐像素相同。必須記錄 target qualities，例如 hierarchy、density、photo integration、ornament balance、source-like flow language。
- `actual-gap`：目前產品與 launch-ready 目標仍有可觀察差距，需要 editor capability、runtime parity、asset/content、fallback 或 visual tuning 處理。必須記錄阻塞類型與下一步 change 或 verification gate。

選擇這個分類，而不是單一 `accepted-difference` 標記，是因為 header/footer 類產品選擇、reference-inspired polish、真正缺口三者需要不同後續動作。單一標記會讓 implementer 不知道要保護、微調還是拆新 capability。

### Treat Header And Footer As Protected Shell Boundaries When Accepted

header/footer 的高度、位置、資訊密度可以在 evidence 中被標為 `protected-product-choice`，前提是範圍只涵蓋被接受的 shell 屬性。保護 shell 不等於保護整個頁面，且不能連帶保護 hero、KPI、flow、media stage、caption 或 ornament 的 page-local gap。

採用這個 boundary 是因為使用者已指出 header/footer 現況不錯，但同時仍希望整體質感往 reference 推。這讓後續 apply 可以保留 shell 手感，同時把頁面內容當成 `reference-quality-target` 或 `actual-gap` 逐頁處理。

### Use Evidence Bundle As Boundary Ledger

新的 `docs/reference-match/fhd-reference-informed-closeout-boundaries.md` 應作為分類定義與填寫規則；`docs/reference-match/fhd-evidence-bundle-template.md` 則是每次 change 的實際填寫入口。Evidence bundle 需要新增 boundary decision table，至少包含：surface、classification、current product choice、reference quality cue、protected attributes、implementation consequence、witness evidence、accepted by、revisit trigger。

選擇 evidence bundle 作為 boundary ledger，是因為 FHD workflow 已要求 AI-authored visual changes 提 evidence。把分類放在同一份 bundle 裡，可以避免另開一份狀態文件造成 launch matrix 與 checklist 不一致。

### Keep Launch Matrix As Status Ledger

`docs/fhd-witness/playback-closeout-matrix.md` 仍應是五頁 closeout 的狀態入口；新的 boundary classification 只補充 pass/fail/blocked 判斷，不取代 launch matrix。Launch matrix 應能引用 boundary decision：例如 shell 差異為 protected choice 時不算 visual fail；同頁 media stage 若仍缺 reference-like density 或 fallback witness，仍可保留 fail 或 blocked。

保留 single status ledger 是為了符合既有 `display-launch-witness-gates`，避免 closeout boundary 文件變成第二份 launch 狀態表。

### Guard The Vocabulary With Focused Tests

這個 change 應更新現有文件導向 tests，而不是新增 browser workflow。測試重點是 contract 是否存在：三種 classification token、boundary decision 欄位、launch matrix 引用方式、visual checklist 的 decision rules。這能在現有 `pnpm --filter @solar-display/web test` 入口中檢查文件 contract，不需要新增外部 visual tooling。

選擇 focused tests 是因為這個 change 不改 runtime pixels；browser witness 應留給後續五頁 polish apply，而不是在 boundary 定義階段製造無效截圖。

## Implementation Contract

**Observable behavior:**

- 後續 FHD-affecting change 的 evidence bundle 能清楚說明 reference mismatch 屬於 `protected-product-choice`、`reference-quality-target` 或 `actual-gap`。
- Reviewer 能從 visual review checklist 判斷：header/footer 這類 shell 差異是否已被正式保護，頁面內容差異是否仍需 polish 或拆 editor capability。
- Launch matrix 能把 accepted shell difference 和 unresolved page gap 分開記錄，不會因 header/footer 與 reference 不同就判 fail，也不會因 shell 被接受就讓整頁 launch-ready。

**Interface / data shape:**

- Boundary decision table 欄位固定為：Surface、Classification、Current Product Choice、Reference Quality Cue、Protected Attributes、Implementation Consequence、Witness Evidence、Accepted By、Revisit Trigger。
- Classification token 固定為：`protected-product-choice`、`reference-quality-target`、`actual-gap`。
- Protected product choice 的 minimum evidence 固定為：surface、protected attributes、accepted-by、witness evidence、revisit trigger。缺任一欄位時不得用它解除 visual fail。
- Reference quality target 的 minimum evidence 固定為：surface、reference quality cue、implementation consequence、witness evidence。它只能描述方向，不得要求 pixel-match。
- Actual gap 的 minimum evidence 固定為：surface、gap type、implementation consequence、verification gate。它必須導向後續 task、change 或 blocked status。

**Failure modes:**

- 若 evidence bundle 未分類重要 reference difference，review 應把該 FHD closeout 視為 incomplete evidence，而不是默認 accepted。
- 若 protected product choice 未列 protected attributes 或 accepted-by，該差異不得用來豁免 visual guardrail。
- 若 launch matrix 只寫 pass/fail 而沒有引用 boundary decision，則五頁 closeout 仍缺可交接 rationale。

**Acceptance criteria:**

- `spectra analyze define-fhd-reference-informed-closeout-boundaries --json` 無 Critical/Warning。
- `spectra validate define-fhd-reference-informed-closeout-boundaries --strict` 通過。
- Apply 後，`pnpm --filter @solar-display/web test` 中相關文件 contract tests 通過，至少覆蓋 fhd evidence workflow、display surface visual guardrails、display launch witness gates。
- Apply 後，文件中能找到三個 classification token、固定 boundary decision 欄位、header/footer protected shell 範例，以及五頁 page content quality target 範例。

**Scope boundaries:**

- In scope：Spectra specs、boundary definition doc、evidence template、visual checklist、launch matrix、editor gap ledger 的分類語彙與文件 contract tests。
- Out of scope：runtime rendering、CSS pixel tuning、editor schema/control、server validation、asset generation、browser witness capture、五頁 launch pass/fail 結論更新。

## Risks / Trade-offs

- [Risk] `protected-product-choice` 被濫用成「不想改就保護」 → Mitigation：要求 accepted-by、protected attributes、witness evidence 與 revisit trigger，且保護範圍不得跨到未列出的 page content。
- [Risk] `reference-quality-target` 太抽象，apply 時仍不知道要改什麼 → Mitigation：要求寫出具體 target qualities，並在 boundary doc 提供五頁範例，例如 flow node clarity、media stage crop density、highlight rail rhythm。
- [Risk] launch matrix 與 boundary doc 變成兩份狀態表 → Mitigation：boundary doc 只定義分類與填寫規則，launch status 仍回寫 single witness matrix。
- [Risk] 文件測試過度約束文案造成未來維護成本 → Mitigation：tests 只檢查必要 classification tokens、欄位與引用 contract，不鎖定完整段落或視覺數值。
- [Risk] 這個 change 不直接改善五頁畫面，短期看不到視覺成果 → Mitigation：把 tasks 明確接到下一輪五頁 polish 前置條件，確保 apply 後能降低誤改 shell 的風險。
