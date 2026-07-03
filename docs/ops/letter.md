# 給未來 session 的信（solar_player）

> 寫於 2026-07-03，由 Fable 5（一次性 session）留下。讀者：未來在本 repo 工作的模型（多半 Sonnet / Opus / Haiku 等級）與使用者本人。
> 歷史快照：不改寫正文，只能文末加日期章節。全域層的信見 `~/.claude/ops/letter.md`。

## 三件使用者沒問、但對這個 repo 最重要的事

### 1. 43 個未歸檔 change 是目前最大的 hygiene 債，值得一次專門清理

2026-07-03 實測：`openspec/changes/` 非 archive 目錄 43 個，抽查 10 個有 9 個 tasks 全勾（疑似完成未歸檔）、1 個全未動（`propose-raw-mqtt-history-persistence`，這是唯一確定的「待辦」）。這筆債每天都在收稅：每個 session 掃 changes/ 都被噪音淹沒，且弱模型可能誤選已完成 change 續作。

**建議做法（等使用者點頭）**：開一個清理 session——先派 agent 產出「每個 change 的 tasks 完成度 + 對應程式碼是否已在 main」清單交使用者核可，再逐個跑 `/spectra-archive`（機械工作，sonnet 即可；每歸檔一個驗一個，不要全批跑完才驗）。清理前，「全勾 ≠ 進行中」是防身符（已寫進 CLAUDE.md 硬規則 1）。

### 2. server 測試 glob 的一行根治法（附驗證步驟）

`apps/server/package.json:10` 的 `tsx --test --test-concurrency=1 src/**/*.test.ts` 在 sh 下漏掉頂層 5 個測試檔（證據見 `docs/ops/diagnosis.md` 問題 3）。根治：glob 加引號讓 tsx/node 自行展開：

```
"test": "tsx --test --test-concurrency=1 \"src/**/*.test.ts\""
```

**修改後必須驗證再宣稱修好**：跑 `pnpm --filter @solar-display/server test`，確認輸出包含 `config.test.ts`、`env.test.ts`、`logger.test.ts`、`server-startup.test.ts`、`serverRuntimeGuard.test.ts` 的測試名（引號展開行為依 tsx/node 版本而異，本信沒有實測過，所以驗證不可省）。修好後按 `docs/ops/maintenance.md`「待回收」節收掉各檔的繞路條款。

### 3. FHD witness 是唯一防 drift 的 gate，但它不是自動的——使用者要主動索取 evidence bundle

這個 repo 的核心風險不是程式壞掉（有測試），而是 playback 頁在一次次「合理的小改」中退化成管理介面（management-surface drift）。witness workflow 是唯一防線，但它沒有 pixel threshold、不會自己擋人——弱模型最可能的偷懶方式是「跑了 witness、貼一句沒問題」。**給使用者的具體建議**：驗收任何 playback 相關工作時，直接要 evidence bundle（`docs/fhd-witness/evidence-template.md` 格式）；拿不出 bundle 就當作沒驗。給未來模型：gap notes 只描述差異、不代簽 intentional/acceptable，這條紅線在 judgment.md §2。

## 這套 repo 制度最可能的退化方式與預防

1. **雙檔再度漂移**（最可能）：有人只改 CLAUDE.md 忘了 AGENTS.md（或反過來），半年後兩檔又各說各話。預防已內建：兩檔開頭都寫了「共用內容必同步、同 commit」，允許的分眾差異白名單在 maintenance.md；使用者可抽查 `git log -- CLAUDE.md AGENTS.md` 看是否成對出現。共用內容漂移 = 缺陷，立即修。
2. **changes 積壓復發**：清理完之後，「完成不歸檔」的習慣讓債重新長回來。預防：硬規則 1「完成即歸檔」；使用者每隔一陣子跑 `ls openspec/changes/ | wc -l` 抽查，數字持續上升就是制度失效的警報。
3. **witness 儀式化**：跑了指令、沒真的比對。預防：evidence bundle 有固定欄位（gap notes 不可空白）；審查模板（delegation.md §5、§6）明文要求「只回可觀察差異清單」——空清單 + 大改動是矛盾訊號，使用者可據此打回。
4. **事實漂移**：scripts、路徑、glob 修好了，文件還留著舊繞路。預防：maintenance.md 的「待回收」節已把兩個已知案例登記在案；通則是「照文件做卻失敗的瞬間 = 修文件」。

## 交接狀態（2026-07-03）

- 已完成：`docs/ops/`（diagnosis、conventions、fhd-closeout、dispatch、judgment、delegation、maintenance、letter）；CLAUDE.md 與 AGENTS.md 改寫為鏡像路由（原版備份 `~/.claude/backups/2026-07-03-solar-player-institution/`）；AGENTS.md 舊版的 web 測試入口錯誤已隨改寫消除。
- 刻意未做（依使用者「本 session 只立制度」指示）：glob 一行修正（見上方第 2 件事）、43 change 清理（第 1 件事）、`docs/goal.md` 空檔與 `docs/FHD.01.html` 殘留的處置（見 diagnosis.md 次要觀察）。
- 進行中的產品工作（與本制度無關，勿混淆）：working tree 上有 Sustainability 頁 household-equivalence 與累積電量單位換算的未提交變更，屬使用者既有工作。
