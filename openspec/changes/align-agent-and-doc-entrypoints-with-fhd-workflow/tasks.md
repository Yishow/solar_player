## 1. 對齊 agent-facing entrypoints

- [ ] 1.1 完成 `Keep agent-facing entrypoints aligned to one display workflow` requirement，讓 `AGENTS.md` 與 `CLAUDE.md` 對 witness batches、evidence bundles、visual canonicals、launch witness gates 使用同一套 workflow 語言；驗證方式為執行 `spectra analyze align-agent-and-doc-entrypoints-with-fhd-workflow --json` 並做內容 review，確認兩份入口文件沒有互相衝突的流程描述。
- [ ] 1.2 完成 `Repo-local skills use the same workflow vocabulary as the entrypoints` requirement 與 repo-local skill entrypoints 的同步，讓 `.agents/skills/display-asset-generation/SKILL.md`、`.agents/skills/display-asset-generation/README.md`、`.agents/skills/product-gap-audit/SKILL.md` 與 agent-facing entrypoints 使用相同 vocabulary；驗證方式為內容 review，確認 skill 文件沒有另起爐灶的流程名稱。

## 2. 對齊 human-facing entrypoints

- [ ] 2.1 完成 `Keep human-facing entrypoints lightweight and navigable` requirement，讓 `README.md` 指向 FHD reference、reference-match、workflow entrypoint guide 與 launch witness docs，而不是重述完整規範；驗證方式為執行 `spectra validate --strict --changes align-agent-and-doc-entrypoints-with-fhd-workflow` 並做內容 review。
- [ ] 2.2 完成 `docs/README.md` 與新文件 `docs/reference-match/fhd-workflow-entrypoints.md`，讓人類讀者可以從 docs index 找到 visual canonicals、evidence workflow、launch witness gate 與對應責任文件；驗證方式為內容 review，確認 docs index 導覽鏈完整。

## 3. 鎖定責任邊界與避免副本漂移

- [ ] 3.1 完成 `Keep AGENTS and CLAUDE aligned as agent-facing mirrors` 的責任邊界說明，確認規範本體仍在 `openspec/` 與 canonical docs，而 `AGENTS.md` / `CLAUDE.md` 只保留入口層規則；驗證方式為 proposal/design/spec 內容 review。
- [ ] 3.2 完成 `Keep README files lightweight and route deeper rules to canonical docs`、`Repo-local skills use the same workflow vocabulary as the entrypoints` 與 `Align repo-local skill docs with the same workflow vocabulary` 的收尾檢查，確認沒有把完整 workflow 規範複製成多份 README 副本，也沒有把 `.codex/hooks.json` 這類 machine-enforced reminder 誤收進本 change；驗證方式為內容 review，確認各入口文件只保留自己的責任範圍。
