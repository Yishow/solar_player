# Agent 工作指引

`docs/ops/` 是 repo 制度的單一事實來源；本檔只保留每次 session 都需要的路由與穩定硬規則。`CLAUDE.md` 是同源分眾入口：共用語意必須同步、同一個 commit；允許的工具差異見 `docs/ops/maintenance.md`。

## Repo 快覽

- pnpm monorepo：`apps/server`（Fastify + SQLite + MQTT）、`apps/web`（Vite + React）、`packages/shared`（共用型別與 playback 邏輯）、`deploy/`（部署）、`openspec/`（Spectra specs + changes）。
- 行為契約以 `openspec/` 的 specs、changes、tasks 為準；一般 `docs/` 與 `.scratch` 不取代 Spectra 實作進度。
- FHD 視覺基準是 `docs/reference/FHD/` 的 PNG；prototype HTML 不是 source of truth。

## 任務路由

| 情境 | 讀 |
|---|---|
| 從需求到交付、`.scratch` / Spectra 分工、archive 與 commit 順序 | `docs/ops/workflow.md` |
| 指令、測試、程式慣例、安全、API 與部署邊界 | `docs/ops/conventions.md` |
| Playback、display editor 或任何 FHD surface | `docs/ops/fhd-closeout.md` |
| 完成判準、何時詢問使用者、方向錯誤訊號 | `docs/ops/judgment.md` |
| 修改制度檔、追查制度歷史或已知債務 | `docs/ops/maintenance.md`，必要時再讀 `docs/ops/diagnosis.md`、`docs/ops/letter.md` |

Claude Code 專用的模型調度與派工文件不套用於本入口；其他工具遵循自身可用能力與上位規則。

## 硬規則

1. **有界交付**：行為變更依 `docs/ops/workflow.md` 使用一個有界 named Spectra change；純問答、研究、review、診斷與無行為影響的制度小修不建立 change。每階段結束須回報目前狀態、下一步與原因；使用者回覆「繼續」即接續執行。Archive 後仍須取得使用者確認才 commit。
2. **真實驗證**：依 `docs/ops/conventions.md` 的現行 scripts 跑受影響測試；交付 gate 是 `pnpm verify`。必須看過實際輸出，不從舊文件或不存在的 gate 推測成功。
3. **Playback／FHD 邊界**：五個 playback 頁依 `docs/reference-match/fhd-workflow-entrypoints.md` 使用 visual canonicals、fresh witness batch、evidence bundle 與 launch witness gates 才算完成；驗收矩陣與模板是 `docs/fhd-witness/playback-closeout-matrix.md`、`docs/fhd-witness/evidence-template.md`，AI 執行 `pnpm run fhd:witness` 與 editor capability 差距整理，人工 acceptance 仍由使用者決定。展示設定必須由 `/display-pages/editor` 表達，不做 page-local hardcode、management-surface drift，亦不為視覺 polish 擴張到 route shell、API 或資料架構。
4. **事實與決策權**：程式碼、root scripts 與實際設定高於文件；只做任務直接要求的最小改動。產品意圖、intentional difference、FHD 品質與 deployment／launch acceptance 由使用者決定。
