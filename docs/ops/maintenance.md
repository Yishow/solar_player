# 制度維護協議（repo 層）

> 讀者：未來要更新本 repo 制度檔的任何模型。目的：讓制度能演化，但不被善意小補養胖、養歪。
> 全域制度檔（`~/.claude/ops/*`）的維護規則見 `~/.claude/ops/maintenance.md`，不歸本檔管。

## 檔案地圖（誰能改什麼）

| 檔案 | 性質 | 誰能改 |
|---|---|---|
| `AGENTS.md`、`CLAUDE.md` | 共用指引與 Claude 匯入入口 | 指引只改 `AGENTS.md`，`CLAUDE.md` 固定為 `@AGENTS.md`；小修（更正事實、路由增減）可自行；加新硬規則要先問使用者 |
| `docs/ops/conventions.md`、`fhd-closeout.md` | 事實描述 | 發現與程式碼不符即修（程式碼是真相），改完 read-back |
| `docs/ops/workflow.md`、`dispatch.md`、`judgment.md` | 規則 | 更正事實、補正反例可自行；改規則本身先問使用者 |
| `docs/ops/delegation.md` | 模板 | 可自行改，改完 read-back 驗證 |
| `docs/ops/diagnosis.md`、`letter.md` | 歷史快照 | 不改寫正文，只能文末加日期章節 |
| `openspec/**` | Spectra artifacts | 只透過 spectra-* skills 操作，不手改結構 |
| `~/.claude/projects/-Users-yishow-prj-solar-player/memory/` | Claude 專案記憶 | 自由追加與更新（Claude 專用，不進 git） |

## 單一指引來源與工具路由

- `AGENTS.md` 是唯一的根指引內容；`CLAUDE.md` 只保留一行 `@AGENTS.md`（不可放在反引號或程式碼區塊內），由 Claude Code 匯入。
- Claude Code 專用的 `dispatch.md`／`delegation.md` 路由放在 `AGENTS.md`，明標僅 Claude Code 適用；其他工具遵循自身能力與上位規則。
- 不在 `CLAUDE.md` 重建 Spectra 區塊或複製共用規則；根入口的工具前綴差異在 `AGENTS.md` 說明，細部指令留在 `docs/ops/`。

## 修改程序（每次都做）

1. **備份**：git 已追蹤的檔案，確認 working tree 乾淨版已在 git 歷史即可（`git log --oneline -1 -- <檔案>`）；有未提交改動或未追蹤檔，先 `cp` 到 `~/.claude/backups/$(date +%Y-%m-%d)-<簡述>/`。
2. 改動實際來源；根指引修改 `AGENTS.md`，確認 `CLAUDE.md` 仍只匯入它。
3. **read-back 驗證**：派 fresh agent 只讀新檔回答「照這份檔你會怎麼做 X」，答錯處 = 你寫模糊了，修到能答對。
4. 教訓記錄（見下節）。制度檔改動 commit 訊息用 `docs: <改了什麼>`，且只含制度檔。

## 教訓寫到哪裡

- **repo 特有的坑**（指令行為、glob、部署怪癖、FHD 流程踩雷）→ 寫進 Claude 專案記憶目錄（一坑一檔 + 更新 MEMORY.md 索引）。先觀察；同類坑出現第 2 次，才升級進 `docs/ops/` 正文（進 git，所有工具可見）。
- **跨專案通用的坑** → `~/.claude/ops/lessons.md`（格式見全域 maintenance.md）。
- 單次事件直接改制度 = 過擬合，禁止。

## 精簡門檻（任一超標，先合併刪除再新增）

- `AGENTS.md` > 80 行，或 `CLAUDE.md` 出現匯入以外的內容。
- `docs/ops/` 單檔 > 200 行。
- 判準過時即刪的觸發器：**照文件做卻失敗的瞬間 = 修文件**；引用的指令/路徑消失 = 刪該條或更新。
- 精簡方法是合併與刪除，不是壓縮句子；新增一條核心規則時優先找一條可刪的。

## 根入口的收錄門檻

- 只收錄 repo 特有、每個 session 都需要、且不易隨工具版本漂移的路由或硬規則。
- 指令、workflow、工具能力、數量與日期等易變事實放在對應 `docs/ops/` 文件；入口只連過去，不複製細節。

## 衝突處理

制度檔之間、或制度與程式碼打架：程式碼與 root scripts 是事實層的真相；規則層以使用者本次指示 > 專案檔（CLAUDE.md/AGENTS.md + docs/ops/）> 全域檔仲裁。修掉來源，不留兩條打架的規則各自生效；修完記教訓。
