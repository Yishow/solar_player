# Repo Harness 診斷報告（A）

> 產出：2026-07-03，Fable 5 repo 制度化 session。歷史快照：不改寫正文，只能在文末加日期章節。
> 這份是本 repo 其他制度檔（conventions、dispatch、judgment、delegation、maintenance）的依據。
> 全域層診斷見 `~/.claude/ops/diagnosis.md`（Claude Code 環境）；本檔只講 solar_player 特有的問題。

## 問題 1：CLAUDE.md 與 AGENTS.md 雙長文件 80–90% 重疊，且已開始漂移（最漏 token）

**證據（2026-07-03 實測）：**
- CLAUDE.md 12.1KB（167 行）每個 Claude session 全文載入 ≈ 3k tokens 固定開銷；AGENTS.md 13.2KB 內容幾乎鏡像（命名規則、error shape、images 限制、MQTT 遮罩、禁止事項逐字對應）。
- 漂移實錘：AGENTS.md 舊版第 131 行宣稱 web 測試入口是 `tsx --test src/**/*.test.ts`，實際是 `node ./scripts/run-tests.mjs`（`apps/web/package.json:12`）。兩份長文件各自演化，同一事實已出現分歧。
- 舊 CLAUDE.md 宣稱「root scripts 只有 dev、dev:web、dev:server、build、test、db:migrate、db:seed」，漏了實際存在的 `fhd:witness`、`fhd:witness:dry-run`、`dev:fix`、`build:*`（`package.json:5-19`）——文件自己違反了自己的「只收錄可證實規則」條款。

**修法（本 session 已執行）：**
- 兩檔都改寫成精簡路由（各 ≤80 行），詳細內容單一來源化到 `docs/ops/`；SPECTRA:START/END 區塊原樣保留（工具管理）。
- 同步規則入 `docs/ops/maintenance.md`：**共用內容**漂移 = 缺陷，發現即修，改動必須同 commit（允許的分眾差異清單也在 maintenance.md）。
- 原檔備份：`~/.claude/backups/2026-07-03-solar-player-institution/`。

## 問題 2：openspec/changes/ 積壓 43 個未歸檔 change（最容易失焦）

**證據（2026-07-03 實測）：**
- 非 archive 的 change 有 43 個；抽查 10 個 tasks.md，9 個 checkbox 全勾（疑似完成未歸檔），1 個全未動（`propose-raw-mqtt-history-persistence`）。
- spectra CLI 不可執行（`npx spectra list` 回 "could not determine executable to run"），流程只以 `.claude/skills/spectra-*` skill 形式存在——沒有低成本指令能一眼看出「真正進行中」的 change。

**後果鏈：** 弱模型跑 `/spectra-apply` 或掃 changes/ 時被 43 個目錄淹沒 → 誤選已完成的 change 續作、或把全勾誤讀成進行中 → context 燒在掃描與誤判，實際工作沒推進。

**修法：**
- （制度，已寫入 CLAUDE.md 硬規則與 judgment.md）change 完成即 `/spectra-archive`，不留積壓；使用者未指名 change 時，apply 前先確認目標名稱。
- （一次性清理，待使用者核可）批次歸檔疑似完成的 change——執行方式見 `docs/ops/letter.md` 第 1 件事。制度檔不代替這次清理；清理沒做之前，「全勾 ≠ 進行中」這條判讀規則是弱模型的防身符。

## 問題 3：`pnpm test` 綠燈是假陽性——server 頂層測試根本沒被跑到（最容易出錯）

**證據（2026-07-03 實測）：**
- server test script 是 `tsx --test --test-concurrency=1 src/**/*.test.ts`（`apps/server/package.json:10`）。pnpm 用 `sh` 執行，`sh` 無 globstar，`src/**/*.test.ts` 退化為 `src/*/*.test.ts`——只匹配至少一層子目錄。
- `apps/server/src/` 頂層有 5 個測試檔完全不被匹配：`config.test.ts`、`env.test.ts`、`logger.test.ts`、`server-startup.test.ts`、`serverRuntimeGuard.test.ts`。
- 實害進行中：查證當下 working tree 正在修改 `serverRuntimeGuard.test.ts`，而 `pnpm test` 不會跑它。

**後果鏈：** 弱模型改了 server 頂層邏輯 → 跑 `pnpm test` 綠燈 → 按全域 judgment「有指令輸出證據」宣稱完成 → 測試其實沒執行。這是「證據先於斷言」制度本身會被騙過的洞。

**修法：**
- （制度，已寫入 conventions.md 與 judgment.md）改到 `apps/server/src/` 頂層檔案時，必須額外直跑對應測試：`pnpm --filter @solar-display/server exec tsx --test src/<檔名>.test.ts`。
- （根治建議，待使用者核可後修 `apps/server/package.json`）把 glob 加引號讓 tsx/node 自行展開：`tsx --test --test-concurrency=1 "src/**/*.test.ts"`。**修改後必須驗證**：跑一次並確認輸出含頂層 5 檔的測試名，再把 conventions.md / judgment.md 的繞路條款收掉（見 maintenance.md 的回收規則）。

## 次要觀察（不進 top-3，修不修由使用者）

- `docs/goal.md` 是 0 byte 空檔；`docs/FHD.01.html`（31.8KB prototype）留在 docs/ 頂層，對弱模型是「當成 source of truth」的誘惑（禁止事項已涵蓋，但檔案還在）。
- `.DS_Store` 有被 git 追蹤的痕跡（出現在 git status modified 清單）。
- `scripts/deploy.test.mjs`（node:test 格式）不在 root `test` script 內，需 `node --test scripts/deploy.test.mjs` 手動跑；改 root `deploy.sh` 時容易忘。
