## 1. 定義 display launch witness matrix

- [ ] 1.1 完成 `Use a page-by-page witness matrix instead of a vague launch checklist` 與 `Define a launch witness matrix for the five playback pages` requirement，讓 `display-launch-witness-gates` 明確列出 Overview、Solar、Factory Circuit、Images、Sustainability 的 authoring、runtime parity、publish refresh、fallback 與 handoff gate；驗證方式為執行 `spectra analyze add-display-launch-witness-gates --json` 並做 artifact content review。
- [ ] 1.2 完成 `docs/reference-match/display-launch-witness-matrix.md`，讓逐頁 pass/fail/blocker 狀態有固定記錄格式，而不是散落在聊天或 PR 文字中；驗證方式為內容 review，確認五頁與所有 launch-critical gates 都有欄位。

## 2. 把 publish refresh 與 fallback 升級為 launch blocker

- [ ] 2.1 完成 `Treat publish refresh and fallback as launch-critical, not post-launch polish` 與 `Treat publish refresh and fallback verification as launch blockers` requirement，讓 publish success 但 live refresh 失敗、或 fallback 破版/空白，都被視為上線 blocker；驗證方式為執行 `spectra validate --strict --changes add-display-launch-witness-gates` 並做 spec content review。
- [ ] 2.2 完成 `display-page-draft-live-publishing` 的 delta spec，讓 `Live publishing is launch-complete only after refresh witness passes` 成為正式 requirement；驗證方式為內容 review，確認 publish 完成定義包含 live refresh witness。

## 3. 把 editor coverage 接到 runtime parity 與 verification pack

- [ ] 3.1 完成 `Page-specific authoring coverage is not launch-complete without runtime parity witness` 的 delta spec，讓 editor authoring coverage 必須搭配逐頁 runtime parity witness 才能視為 launch-ready；驗證方式為內容 review，確認 `display-editor-page-authoring-coverage` 補上 launch 語境。
- [ ] 3.2 完成 `Keep launch verification evidence inside the repo workflow` 與 `docs/reference-match/display-launch-verification-pack.md`，讓 repo 內有固定 command pack、manual witness checks 與結果記錄方式可供新的 reviewer 重跑；驗證方式為內容 review，確認 verification pack 能對應現有 targeted tests 與手動檢查路徑。

## 4. 對齊現有 audit 並鎖定單一狀態來源

- [ ] 4.1 完成 `Keep launch gates evidence-driven inside the current repo workflow` 的 audit 對齊，讓 `docs/reference-match/all-pages-audit.md` 與 `docs/reference-match/all-pages-checklist.md` 映射到新的 witness matrix，並明確作為輸入與盤點輔助，而不是平行的 launch status ledger；驗證方式為內容 review，確認 launch-critical gates 能從 audit 文件追溯到 matrix。
- [ ] 4.2 完成 `Keep launch status in one authoritative matrix` 與 `Use a page-by-page witness matrix instead of a vague launch checklist` 的權威來源收尾，讓 `docs/reference-match/display-launch-witness-matrix.md` 成為唯一 pass/fail/blocked 狀態記錄，`docs/reference-match/display-launch-verification-pack.md` 只負責 procedure 與 rerun 指引；驗證方式為內容 review，確認 reviewer 不需要同時維護多份 launch 狀態文件。
