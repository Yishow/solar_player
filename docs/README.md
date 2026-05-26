# Documentation Index

這個目錄集中保存產品開發仍需查閱、但不應佔據 repo 根目錄入口的文件與參考素材。

## Structure

- `openapi.yaml` — 目前 server 使用的 OpenAPI 規格檔。
- `runbooks/device-diagnostics-safe-ops.md` — `Device Status` safe diagnostics、host-level restart 與 unsupported controls 的維運 runbook。
- `archive/prompt-pack/` — 舊的 root README 與 Phase 1–10 提示詞／工作流文件。
- `archive/solar-display/` — `solar-display/` 子目錄時期留下的歷史 README。
- `reference/solar_complete_spec_md/` — UI 規格、分頁提示詞與設計 token 參考。
- `reference/kuozui-green-fhd-html-prototype/` — FHD HTML prototype、截圖與素材參考。
- `reference/mqtt/` — MQTT 相關輔助程式與參考模組。
- `reference/example/` — 額外的示例資料夾（若有保留內容）。
- `downloads/` — 舊提示詞包與規格壓縮檔。

## When to use these docs

- 想了解目前產品如何運作與如何開發：請優先看 repo 根目錄 `README.md`。
- 想依照正式變更流程提案、實作與封存：請看 root `AGENTS.md`、`CLAUDE.md` 與 `openspec/`。
- 想處理 FHD / display workflow 入口：先看 `reference-match/fhd-workflow-entrypoints.md`，再進入 `playback-visual-canonicals.md`、`fhd-evidence-bundle-template.md`、`display-launch-witness-matrix.md`。
- 想處理 `Device Status`、安全 diagnostics 與 host-level restart 邊界：先看 `runbooks/device-diagnostics-safe-ops.md`。
- 想查歷史提示詞、UI 參考稿、prototype 或 MQTT 補充素材：從這個目錄往下找對應子目錄。
