# Solar Display System — Phase 1–10 開發提示詞規格包（Spectra 工作流版）

本壓縮包用途：提供給 Cursor / Claude Code / Codex / ChatGPT Coding Agent 作為完整開發系統提示詞。

本版已補齊以下規則：

1. 每一個 Phase 都必須先使用 `spectra-propose` 起草方案。
2. proposal 通過後才可使用 `spectra-apply` 實作。
3. 每個 Phase 的 commit message 必須使用繁體中文。
4. 每個 Phase 完成後必須進行 code-review。
5. code-review 發現問題必須 fix bugs。
6. 修復完成後必須再以繁體中文 commit。
7. 完成該 Phase 的驗收後，才可以進入下一個 Phase。
8. UI 必須參考 `solar_complete_spec_md` 目錄下的規範。
9. UI 各頁必須參考 `solar_complete_spec_md/UI` 底下的分頁提示詞與範例圖。
10. MQTT 讀取規格已根據上傳的 `solar.zip` MQTT 發送程式補齊。

建議使用順序：

1. 先閱讀 `00_MASTER_DEVELOPMENT_PROMPT.md`
2. 再閱讀 `01_SPECTRA_WORKFLOW_RULES.md`
3. 開始 Phase 1 時，使用 `02_PHASE_1_TO_10_DEVELOPMENT_PROMPT.md`
4. 實作時同步核對：
   - `03_TASK_CHECKLIST.md`
   - `04_ACCEPTANCE_CHECKLIST.md`
   - `05_MQTT_TAG_READING_SPEC_FROM_SOLAR_ZIP.md`
   - `06_UI_REFERENCE_AND_DESIGN_TOKEN_RULES.md`
   - `07_COMMIT_CODE_REVIEW_AND_BUGFIX_RULES.md`

重要：不可一次實作多個 Phase。每次只能執行一個 Phase 的 `spectra-propose`、`spectra-apply`、commit、code-review、bugfix、final commit 與驗收。
