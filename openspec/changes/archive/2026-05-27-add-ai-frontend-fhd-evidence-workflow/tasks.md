## 1. 建立 AI 專用的 FHD evidence workflow 規格

- [x] 1.1 完成 `Require evidence bundles for every FHD-affecting frontend change` 與 `Require witness-batch evidence for FHD-affecting frontend changes` 的規格，讓 AI 前端變更在 proposal 階段就帶 witness batch、evidence bundle 與 verification pack；驗證方式為執行 `spectra analyze add-ai-frontend-fhd-evidence-workflow --json` 並做 artifact content review。
- [x] 1.2 完成 `Split FHD work by witness batch and surface family` 與 `Split FHD work by surface family and reviewable scope` 的規格，讓 AI 必須先切出 playback、management、editor 或 launch audit scope，而不是做成單一大 diff；驗證方式為 artifact content review，確認 tasks/design/spec 使用相同分批語言。
- [x] 1.3 完成 `Record exceptions instead of allowing silent local optimizations` 與 `Record FHD exceptions as durable review artifacts` 的規格，讓 witness 偏離都要留下 exception ledger；驗證方式為 proposal/design/spec 內容 review，確認例外記錄格式與用途清楚。
- [x] 1.4 完成 `Visual review checklist remains part of the AI-authored change workflow` 的既有 spec 擴充，確認 visual checklist 不再只是孤立文件，而是 evidence workflow 的一部分；驗證方式為執行 `spectra validate --strict --changes add-ai-frontend-fhd-evidence-workflow`。

## 2. 提供可直接複用的 evidence 模板

- [x] 2.1 完成 `Require evidence bundles for every FHD-affecting frontend change` 的模板落地，讓 `docs/reference-match/fhd-evidence-bundle-template.md` 能記錄 witness batch、affected surfaces、protected attributes、exceptions 與 verification pack；驗證方式為內容 review，確認模板足以支援 playback、management 與 editor 三類 surface。
- [x] 2.2 完成 `Split FHD work by witness batch and surface family` 的 guide 與 `Record exceptions instead of allowing silent local optimizations` 的 ledger 模板，讓 `docs/reference-match/fhd-surface-split-guide.md` 和 `docs/reference-match/fhd-exception-ledger-template.md` 能指導 AI 拆分 scope 並留下偏離 witness 的理由；驗證方式為內容 review，確認模板與 guide 可直接拿來起草下一個 change。

## 3. 接到可引用與可檢查的 workflow 接點

- [x] 3.1 完成 `Require witness-batch evidence for FHD-affecting frontend changes`、`Split FHD work by surface family and reviewable scope` 與三份 `docs/reference-match/*` 模板之間的 cross-reference，讓 workflow vocabulary 能由 canonical docs 直接引用；驗證方式為內容 review，確認 spec、guide、template 對 witness batch、surface family、exception ledger、verification pack 使用同一套語言。
- [x] 3.2 完成 `.codex/hooks.json` 的輕量提醒或檢查設計，讓明顯屬於 FHD / playback / shared chrome 的變更不會跳過 evidence workflow；驗證方式為內容 review 與 hook 配置檢查，確認規則只鎖定相關路徑而不過度擴張。
