<!-- SPECTRA:START v1.0.2 -->

# Spectra Instructions

This project uses Spectra for Spec-Driven Development(SDD). Specs live in `openspec/specs/`, change proposals in `openspec/changes/`.

## Use `/spectra-*` skills when:

- A discussion needs structure before coding → `/spectra-discuss`
- User wants to plan, propose, or design a change → `/spectra-propose`
- Tasks are ready to implement → `/spectra-apply`
- There's an in-progress change to continue → `/spectra-ingest`
- User asks about specs or how something works → `/spectra-ask`
- Implementation is done → `/spectra-archive`
- Commit only files related to a specific change → `/spectra-commit`

## Workflow

discuss? → propose → apply ⇄ ingest → archive

- `discuss` is optional — skip if requirements are clear
- Requirements change mid-work? Plan mode → `ingest` → resume `apply`

## Parked Changes

Changes can be parked（暫存）— temporarily moved out of `openspec/changes/`. Parked changes won't appear in `spectra list` but can be found with `spectra list --parked`. To restore: `spectra unpark <name>`. The `/spectra-apply` and `/spectra-ingest` skills handle parked changes automatically.

<!-- SPECTRA:END -->

# Claude Code 專案指引（2026-07-03 重整）

單一事實來源在 `docs/ops/`；本檔只放路由與每次都要遵守的硬規則。`AGENTS.md` 是本檔的同源分眾版（給非 Claude 工具）：**共用內容改動必同步、同一個 commit**；允許保留的分眾差異清單在 `docs/ops/maintenance.md`，不要為了「一字不差」把分眾差異抹掉。原版備份：`~/.claude/backups/2026-07-03-solar-player-institution/`。

## Repo 快覽

- pnpm monorepo：`apps/server`（Fastify + SQLite + MQTT）、`apps/web`（Vite + React）、`packages/shared`（共用型別與 playback 邏輯）、`deploy/`（現行部署）、`openspec/`（Spectra specs + changes）。正式工作目錄就是 repo root，別把 `solar-display/` 或舊 prompt package 當入口。
- 實作前先看 `openspec/`（specs、changes、tasks），不是先翻 `docs/`。
- FHD 視覺基準：`docs/reference/FHD/` 的 PNG；prototype HTML 一律不是 source of truth。

## 路由表（情境 → 讀哪個檔）

| 情境 | 讀 |
|---|---|
| 跑指令、測試入口、命名/import 慣例、server 行為、安全與部署邊界 | `docs/ops/conventions.md` |
| 要碰 playback 頁、display editor、任何 FHD surface | `docs/ops/fhd-closeout.md` |
| 要派 subagent、選 model、任務失敗要升級 | `docs/ops/dispatch.md` |
| 判斷完成沒、該不該問使用者、方向錯了沒 | `docs/ops/judgment.md` |
| 撰寫派工 prompt | `docs/ops/delegation.md` |
| 要修改 CLAUDE.md / AGENTS.md / docs/ops/ 本身 | `docs/ops/maintenance.md` |
| 接手長期工作、制度說不通、想知道已知債務 | `docs/ops/letter.md` |
| 想知道這些規則的證據 | `docs/ops/diagnosis.md` |

## 硬規則（不讀細節也要遵守）

1. **Spectra 是正式流程**：discuss? → propose → apply ⇄ ingest → archive。「繼續做某個 change」= `/spectra-apply`；`/spectra-ingest` 只在需求中途變動、要回補 artifacts 時用。change 完成立即 `/spectra-archive`，不留積壓；使用者沒指名 change 時，apply 前先確認目標名稱（changes/ 裡大量全勾目錄是「完成未歸檔」，不是進行中）。
2. **測試要真的跑到**：改 `apps/server/src/` 頂層檔案時 `pnpm test` 跑不到對應測試（glob 陷阱），必須直跑該檔測試並引用輸出。細節見 conventions.md。
3. **Playback 五頁的「完成」= fresh FHD witness**（`pnpm run fhd:witness -- --base-url <url>`）對照 `docs/reference/FHD/` + evidence bundle；build 綠燈或 checkbox 全勾都不算。
4. **展示設定由 `/display-pages/editor` 維護**：不可 page-local hardcode 繞過；editor 表達不了就先擴 editor capability。
5. **Playback 頁不可退化成 management 視覺**（glass cards、toolbar stack、table-first）；flow/circuit/icon 維持 source-like 語言；不為視覺 polish 動 route shell、server API、SQLite/MQTT 架構。
6. **不要發明 repo 沒有的東西**：沒有 lint、e2e、coverage gate、CI policy；規則只收錄能指出對應檔案或行為的，沒證據不寫。
7. **最小改動**：只做任務直接要求的；規格與現況衝突時回到 root scripts、`apps/`、`packages/shared`、`deploy/`、`openspec/` 查證。
8. 瀏覽器測試用 `agent-browser` skill；AI 可主導執行，但產品意圖、FHD 品質門檻、intentional difference、launch acceptance 由使用者決定。

## Agent skills

### Issue tracker

Issues 以本地 markdown 存放於 `.scratch/<feature>/`（離線友善，不使用 GitHub Issues）。詳見 `docs/agents/issue-tracker.md`。

### Triage labels

沿用預設五個角色：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。詳見 `docs/agents/triage-labels.md`。

### Domain docs

Single-context：root 一份 `CONTEXT.md` + `docs/adr/`。詳見 `docs/agents/domain.md`。

<!--
FHD Workflow Entrypoints Reference:
- docs/reference-match/fhd-workflow-entrypoints.md
- witness batch
- evidence bundle
- visual canonicals
- launch witness gates
- docs/fhd-witness/playback-closeout-matrix.md
- docs/fhd-witness/evidence-template.md
- pnpm run fhd:witness
- docs/reference/FHD/
- editor capability
- human
-->

