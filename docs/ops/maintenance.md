# 制度維護協議（repo 層）

> 讀者：未來要更新本 repo 制度檔的任何模型。目的：讓制度能演化，但不被善意小補養胖、養歪。
> 全域制度檔（`~/.claude/ops/*`）的維護規則見 `~/.claude/ops/maintenance.md`，不歸本檔管。

## 檔案地圖（誰能改什麼）

| 檔案 | 性質 | 誰能改 |
|---|---|---|
| `CLAUDE.md`、`AGENTS.md` | 每 session 載入的同源分眾路由 | 小修（更正事實、路由增減）可自行；**共用內容必同步、同 commit**；加新硬規則要先問使用者 |
| `docs/ops/conventions.md`、`fhd-closeout.md` | 事實描述 | 發現與程式碼不符即修（程式碼是真相），改完 read-back |
| `docs/ops/dispatch.md`、`judgment.md` | 規則 | 更正事實、補正反例可自行；改規則本身先問使用者 |
| `docs/ops/delegation.md` | 模板 | 可自行改，改完 read-back 驗證 |
| `docs/ops/diagnosis.md`、`letter.md` | 歷史快照 | 不改寫正文，只能文末加日期章節 |
| `<SPECTRA:START>...<SPECTRA:END>` 區塊 | 工具管理 | 不手改，由 Spectra 工具維護 |
| `openspec/**` | Spectra artifacts | 只透過 spectra-* skills 操作，不手改結構 |
| `~/.claude/projects/-Users-yishow-prj-solar-player/memory/` | Claude 專案記憶 | 自由追加與更新（Claude 專用，不進 git） |

## CLAUDE.md ↔ AGENTS.md：允許的分眾差異（除此之外的分歧 = 漂移缺陷，發現即修）

- SPECTRA 區塊：兩檔各自由工具維護（`/spectra-*` vs `$spectra-*`、wording 小異），不手動對齊。
- AGENTS.md 獨有：路由表兩行的「（Claude Code 特有機制）」標註、以及「非 Claude 工具跳過 dispatch/delegation」那一段。
- CLAUDE.md 獨有：硬規則 8 的「瀏覽器測試用 `agent-browser` skill」句（Claude 專屬 skill）。
- 其餘所有內容（快覽、路由表、硬規則 1–7）視為共用內容，逐條語意一致，只允許 `/spectra-*` 與 `$spectra-*` 的前綴差異。

## 修改程序（每次都做）

1. **備份**：git 已追蹤的檔案，確認 working tree 乾淨版已在 git 歷史即可（`git log --oneline -1 -- <檔案>`）；有未提交改動或未追蹤檔，先 `cp` 到 `~/.claude/backups/$(date +%Y-%m-%d)-<簡述>/`。
2. 改動（CLAUDE.md 與 AGENTS.md 記得成對改）。
3. **read-back 驗證**：派 fresh agent 只讀新檔回答「照這份檔你會怎麼做 X」，答錯處 = 你寫模糊了，修到能答對。
4. 教訓記錄（見下節）。制度檔改動 commit 訊息用 `docs: <改了什麼>`，且只含制度檔。

## 教訓寫到哪裡

- **repo 特有的坑**（指令行為、glob、部署怪癖、FHD 流程踩雷）→ 寫進 Claude 專案記憶目錄（一坑一檔 + 更新 MEMORY.md 索引）。先觀察；同類坑出現第 2 次，才升級進 `docs/ops/` 正文（進 git，所有工具可見）。
- **跨專案通用的坑** → `~/.claude/ops/lessons.md`（格式見全域 maintenance.md）。
- 單次事件直接改制度 = 過擬合，禁止。

## 精簡門檻（任一超標，先合併刪除再新增）

- `CLAUDE.md`、`AGENTS.md` 各 > 80 行（不含 SPECTRA 區塊）。
- `docs/ops/` 單檔 > 200 行。
- 判準過時即刪的觸發器：**照文件做卻失敗的瞬間 = 修文件**；引用的指令/路徑消失 = 刪該條或更新。
- 精簡方法是合併與刪除，不是壓縮句子；新增一條核心規則時優先找一條可刪的。

## 已知的「待回收」條款（修好根因後要記得收掉）

- server 測試 glob 陷阱：若 `apps/server/package.json` 的 test script 修好（glob 加引號並驗證頂層 5 檔真的被跑到），要同步收掉 conventions.md「glob 陷阱」節、CLAUDE.md/AGENTS.md 硬規則 2、judgment.md §1 特別條款、dispatch.md 速查表的直跑條款。留著過時的繞路條款會讓弱模型做白工。
- changes 積壓：43 個未歸檔 change 清理完成後，CLAUDE.md/AGENTS.md 硬規則 1 括號內的「大量全勾目錄」警語可簡化。

## 衝突處理

制度檔之間、或制度與程式碼打架：程式碼與 root scripts 是事實層的真相；規則層以使用者本次指示 > 專案檔（CLAUDE.md/AGENTS.md + docs/ops/）> 全域檔仲裁。修掉來源，不留兩條打架的規則各自生效；修完記教訓。
