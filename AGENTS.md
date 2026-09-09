<!-- SPECTRA:START v1.0.2 -->

# Spectra Instructions

Specs live in `openspec/specs/`; named changes live in `openspec/changes/`.
Use `docs/ops/workflow.md` to choose direct work or Spectra. For Spectra work, use `$spectra-*` skills; resume with `apply`, use `ingest` only when requirements change. Command routing and closeout rules live in the workflow document.

<!-- SPECTRA:END -->

# Agent 工作指引

`docs/ops/` 是 repo 制度的單一事實來源；本檔只保留每次 session 都需要的路由與穩定硬規則。`CLAUDE.md` 是同源分眾入口：共用語意必須同步、同一個 commit；允許的工具差異見 `docs/ops/maintenance.md`。

## Repo 快覽

- pnpm monorepo：`apps/server`（Fastify + SQLite + MQTT）、`apps/web`（Vite + React）、`packages/shared`（共用型別與 playback 邏輯）、`deploy/`（部署）、`openspec/`（Spectra specs + changes）。
- 行為契約以 `openspec/` 的 specs、changes、tasks 為準；一般 `docs/` 與 `.scratch` 不取代 Spectra 實作進度。
- FHD 視覺基準是 `docs/reference/FHD/` 的 PNG；prototype HTML 不是 source of truth。

## 任務路由

| 情境 | 讀 |
|---|---|
| 任務分流、連續交付、完成狀態與 commit | `docs/ops/workflow.md` |
| 指令、測試、程式慣例、安全、API 與部署邊界 | `docs/ops/conventions.md` |
| Playback、display editor 或任何 FHD surface | `docs/ops/fhd-closeout.md` |
| 授權不明、風險或方向錯誤訊號 | `docs/ops/judgment.md` |
| 修改制度檔、追查制度歷史或已知債務 | `docs/ops/maintenance.md`，必要時再讀 `docs/ops/diagnosis.md`、`docs/ops/letter.md` |

Claude Code 專用的模型調度與派工文件不套用於本入口；其他工具遵循自身可用能力與上位規則。

## 硬規則

1. **有界交付**：依 workflow 分流；恢復既有契約的局部修正可直接做，新功能、契約變更、資料遷移與跨模組設計使用 named Spectra change。已授權實作連續完成 review、修正與驗證；只有使用者明確要求才 commit，且精準選檔。
2. **真實驗證**：依 conventions 跑受影響檢查；程式交付前以最終版本跑 `pnpm verify`，純文件修改跑相關文件檢查。必須看過實際輸出，明列未驗證事項。
3. **Playback／FHD 邊界**：依 `docs/ops/fhd-closeout.md` 與 `docs/reference-match/fhd-workflow-entrypoints.md` 使用 visual canonicals、fresh witness batch、evidence bundle 與 launch witness gates。AI 跑 `pnpm run fhd:witness`、整理 editor capability 差距；驗收依 `docs/fhd-witness/playback-closeout-matrix.md` 與 `docs/fhd-witness/evidence-template.md`。展示設定由 `/display-pages/editor` 表達，不做 page-local hardcode 或 management-surface drift；人工 acceptance 由使用者決定。
4. **事實與決策權**：現行程式碼、scripts 與設定用來確認實際行為，預期行為依規格與使用者要求；兩者不符須釐清。只做授權範圍；產品意圖、intentional difference、FHD 品質與 deployment／launch acceptance 由使用者決定。
