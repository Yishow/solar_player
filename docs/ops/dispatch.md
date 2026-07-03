# 模型調度守則（repo 層）

> 讀者：在本 repo 擔任主對話的 Claude Code 模型（含 Sonnet / Haiku 等級）。
> 分工：全域守則 `~/.claude/ops/model-dispatch.md` 管通用規則（指揮官不下場、派工三件套、升降級路徑、驗證不自驗）；**本檔只加 solar_player 特有的對照**。全域檔讀不到時，用下方「最低限度」節即可安全運作。

## 最低限度（全域檔不可得時的自足版）

- 大量讀檔（≥3 檔）、掃 repo、查網頁、批次改檔 → 派 subagent，主對話只收結論與 `檔案:行號`。
- 每個派工 prompt 必含：目標與動機、可檢查的驗收條件、回報格式（模板見 `docs/ops/delegation.md`）。
- model 參數（實測 2026-07-03）：`haiku` < `sonnet` < `opus`。預設 `sonnet`；haiku 錯 1 次直接升 sonnet；sonnet 同一子任務連錯 2 次帶完整失敗軌跡升 opus；同一做法最多重試 2 輪。
- 驗收派 fresh agent（不可用 `fork`——fork 繼承 context 會有同樣盲點），寫的人不驗自己的東西。

## Repo 探索的第一選擇：codebase-memory graph

本 repo **已被 codebase-memory 索引**（2026-07-03 實測約 2.2 萬 nodes；數字隨程式碼漂移，以 `index_status` 當下回報為準）。找程式碼時的優先序：

1. `search_graph` / `trace_path` / `get_code_snippet`（函式、route、呼叫鏈、精確 symbol）
2. `search_code`（graph 加持的文字搜尋）
3. Grep/Glob/Read（設定檔、markdown、graph 查不到的東西）

派 Explore agent 時，在 prompt 裡明寫「本 repo 已有 codebase-memory 索引，優先用 mcp__codebase-memory-mcp__* 工具」——subagent 不會自己想到。索引查詢失敗就直接退回 Grep，不要重試糾纏。

## 本 repo 常見任務型態 → 派工對照

| 任務 | 做法 | model |
|---|---|---|
| 找「X 在哪實作/誰呼叫」 | codebase-memory graph 或派 `Explore` | 省略或 `sonnet` |
| Spectra change 實作 | 主對話跑 `/spectra-apply`（`.spectra.yaml` 已為各 spectra 階段設好 effort，不用另調） | 依 skill |
| 一般 server/web 修改 | `general-purpose` 實作，驗收條件必含 conventions.md 的正確測試指令（含頂層 glob 直跑條款） | `sonnet` |
| SQLite migration、MQTT runtime、playback shell、跨 app 資料流的診斷 | 難題，直接高階處理 | `opus` |
| playback 頁 FHD polish | 實作 `sonnet`；驗收 = witness 流程（見下節），不是純 code review | `sonnet` + witness |
| 批次機械修改（rename、改 import、套已定模式） | 模式先由 sonnet/opus 定案並附 before/after 範例，再批次套用 | `haiku` |
| 外部文件/框架問題（Fastify、Vite、node:test…） | `general-purpose` 用 context7 / WebSearch | `sonnet` |
| 第二意見 / 卡死救援 | `codex:codex-rescue`（OpenAI 模型，獨立視角） | — |

## 視覺驗收的特殊規則（本 repo 最特殊的一塊）

playback 頁的視覺「對不對」**不能只靠模型看 code 判斷**，任何等級都不行：

1. 先跑 `pnpm run fhd:witness -- --base-url <url>` 拿 fresh 1920x1080 截圖。
2. 派 fresh agent 把截圖與 `docs/reference/FHD/` 對應 PNG 並排比對，只回報「可觀察差異清單」（位置、元素、差在哪），不下「可接受/不可接受」結論。
3. 差異是否 intentional、是否達 launch 品質——**交使用者判定**。這是 harness 極限：品味與驗收判斷制度補不了（全域 judgment.md §6），不要讓任何 agent 代替使用者簽收。

## 驗收指令速查（派工 prompt 直接抄）

- server：`pnpm --filter @solar-display/server test`；改 `apps/server/src/` 頂層檔另加 `pnpm --filter @solar-display/server exec tsx --test src/<檔名>.test.ts`
- web：`pnpm --filter @solar-display/web test`
- shared：`pnpm run build` + 受影響 app 測試
- root deploy.sh：`node --test scripts/deploy.test.mjs`
- 全部：`pnpm run test`（記得它不含 server 頂層測試與 deploy 測試）
