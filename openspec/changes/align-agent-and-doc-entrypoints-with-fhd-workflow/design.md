## Context

目前 repo 有多個入口層：

- agent-facing：`AGENTS.md`、`CLAUDE.md`、repo-local skills
- human-facing：`README.md`、`docs/README.md`
- canonical artifacts：`openspec/specs/*`、`openspec/changes/*`、`docs/reference-match/*`

前三個新 change 已經把規範本體建立起來，但如果入口文件不一起同步，之後會出現兩種 drift：

- agent 入口文件仍停留在舊流程，沒有先走 witness batch / evidence workflow / launch gate
- human 入口文件仍只講 repo 結構與指令，沒有講 display/FHD 改動要查哪裡、怎麼驗證

## Goals / Non-Goals

**Goals:**

- 讓 agent-facing 與 human-facing 入口都能導向同一套 FHD/display workflow
- 明確分工各入口文件的責任，避免規範全文到處複製
- 降低 `AGENTS.md`、`CLAUDE.md`、skills、README 類文件之間的語義漂移

**Non-Goals:**

- 不在此 change 內新增新的 FHD/product 規範本體
- 不把完整 spec 內容全文複製進 `README.md`
- 不改動產品程式碼或 runtime behavior
- 不接管 `.codex/hooks.json` 或其他 machine-enforced workflow reminder；那些檢查接點仍由 evidence-workflow change 負責

## Decisions

### Keep AGENTS and CLAUDE aligned as agent-facing mirrors

決策：`AGENTS.md` 與 `CLAUDE.md` 都屬 agent-facing 入口，應維持同一套 workflow 語意與主要規則，不讓其中一份演化成另一套流程。

理由：兩份文件都會被不同 agent 或不同入口讀取；只更新其中一份，等於主動製造 drift。

替代方案：

- 只維護 `AGENTS.md`。拒絕原因：repo 目前明確存在 `CLAUDE.md`，忽略它會讓另一個入口立刻落後。

### Keep README files lightweight and route deeper rules to canonical docs

決策：`README.md` 與 `docs/README.md` 只做入口導覽，不承載完整規範。它們應指出 FHD reference、reference-match、visual checklist、entrypoint guide 與 openspec 的位置。

理由：README 太重，之後最容易變成另一份過時規範副本。

替代方案：

- 把完整 workflow 規範直接寫進 root README。拒絕原因：入口文件會過長，且之後難同步。

### Align repo-local skill docs with the same workflow vocabulary

決策：repo-local skills 只補足執行層 guidance，語彙需與 agent entrypoints、human docs、spec artifacts 一致，例如 `witness batch`、`evidence bundle`、`launch witness gate`。

理由：skill 是 AI 最常直接命中的入口，如果它用另一套說法，前面的規範還是會被繞過。

替代方案：

- 不更新 skill docs。拒絕原因：apply 時最可能直接從 skill 進入，放著不改會導致規範落空。

## Implementation Contract

- Behavior:
  - 新加入或繼續工作的 agent 可以從 `AGENTS.md` 或 `CLAUDE.md` 得到同一套 FHD/display workflow 入口。
  - 人類開發者可以從 `README.md` 與 `docs/README.md` 找到該去看哪份 reference、哪份 reference-match doc、哪份 launch gate 文件。
- Interface / data shape:
  - 新 spec `agent-and-doc-entrypoint-alignment` 定義入口對齊行為。
  - `docs/reference-match/fhd-workflow-entrypoints.md` 提供一份集中索引，串起 canonicals、evidence workflow、launch gates 與對應入口文件責任。
- Failure modes:
  - 若 `AGENTS.md` 與 `CLAUDE.md` 提到不同 workflow，視為 agent entrypoint drift。
  - 若 `README.md` 或 `docs/README.md` 需要讀者自行猜測 FHD/display workflow 入口，視為 human entrypoint 不足。
- Acceptance criteria:
  - `spectra analyze align-agent-and-doc-entrypoints-with-fhd-workflow --json`
  - `spectra validate --strict --changes align-agent-and-doc-entrypoints-with-fhd-workflow`
  - 內容 review 能清楚區分每份入口文件的責任邊界
- Scope boundaries:
  - In scope：agent docs、human docs、repo-local skills、entrypoint index
  - Out of scope：新產品規範、產品程式碼、FHD 視覺實作、`.codex/hooks.json` 等 machine-enforced workflow reminder

## Risks / Trade-offs

- [入口文件複製太多規則導致同步成本高] → 讓 README 保持輕量，只導向 canonical docs
- [AGENTS 與 CLAUDE 仍逐步分歧] → 在 tasks 中要求 mirror 對齊與內容 review
- [skill doc 語彙與 spec 不一致] → 顯式統一 workflow vocabulary
- [把 hook ownership 也混進來] → 保持 hook 留在 evidence-workflow change，入口同步 change 只處理文字入口與索引
