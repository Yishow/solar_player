# 派工 Prompt 模板（solar_player 實例化版）

> 用法：選任務型態 → 複製 → 填 `[...]` → Agent tool 派出。
> 本檔是 `~/.claude/ops/delegation-templates.md` 的 repo 特化版：repo 指令、路徑、禁區都已填好，弱模型照抄即可。model 選擇見 `docs/ops/dispatch.md`。
> 通則：subagent 看不到你的對話，背景要寫到「沒讀過對話的人能做對」。

## 通用尾段（每個模板結尾都附上）

```
回報規則：
- 只回結論與 檔案:行號，不要貼檔案全文或工具輸出原文。
- 超過 30 行的產物寫到 [落檔路徑]，回報路徑 + 5 行內摘要。
- 明確回報：完成了什麼、沒完成什麼、卡在哪、每條驗收條件的實際驗證結果。
- 失敗或不確定就直說，禁止假裝完成。
```

## 1. 搜尋 / 定位（agent: Explore；model 省略或 sonnet）

```
你在 /Users/yishow/prj/solar_player（pnpm monorepo：apps/server Fastify+SQLite+MQTT、apps/web Vite+React、packages/shared）。
本 repo 已有 codebase-memory 索引：找函式/route/呼叫鏈優先用 mcp__codebase-memory-mcp__ 的 search_graph / trace_path / get_code_snippet（用 ToolSearch 載入）；查詢失敗就退回 Grep，不要糾纏。
任務：找出 [要找什麼，例：playback rotation 排程的實作與所有呼叫點]。
動機：[為什麼找，例：要改 rotation 間隔的設定來源，需要完整影響面]。
範圍：[目錄]；也檢查 [別名/舊命名] 變體。web 是 extensionless import、server 是 .js 副檔名 import，搜尋時兩種都要涵蓋。
驗收條件：
- 每個位置附 檔案:行號 與一句話角色說明。
- 明說用了哪些搜尋方式與 pattern，讓我能判斷有沒有漏。
回報格式：清單，按 [重要性/目錄] 排序。
```

## 2. 實作（agent: general-purpose；model: sonnet，難題 opus）

```
你在 /Users/yishow/prj/solar_player。先讀 docs/ops/conventions.md（指令與慣例）；若任務碰 playback 頁或 display editor，再讀 docs/ops/fhd-closeout.md。
任務：[要實作什麼，一句話]。
動機與背景：[使用者需求 + 關鍵 context，例：跟隨哪個既有檔案的模式]。
範圍：改 [檔案/模組]。禁區：不動 route shell、server API 回應形狀、SQLite schema、MQTT topic；不在 playback 頁寫 page-local hardcode 繞過 /display-pages/editor；不放寬 images 上傳限制/MQTT 密碼遮罩/reboot 停用。
做法約束：server 用 ESM .js 副檔名 import、web 用 extensionless；API 改動跟隨該 route 既有回應形狀；測試放被測檔旁邊命名 *.test.ts。
驗收條件：
- [行為條件，例：GET /api/x 缺參數回 400 與 { success:false, error, timestamp }]
- [測試指令：server 改動跑 pnpm --filter @solar-display/server test；改到 apps/server/src/ 頂層檔另跑 pnpm --filter @solar-display/server exec tsx --test src/<檔名>.test.ts；web 改動跑 pnpm --filter @solar-display/web test；shared 改動跑 pnpm run build + 受影響 app 測試]
- 無未使用 import/變數；範圍外零 diff。
回報格式：改了哪些檔（檔案:行號）、每條驗證指令的實際輸出結論、未盡事項。
```

## 3. 重構 / 批次修改（agent: general-purpose；model: 模式已定 haiku，否則 sonnet）

```
你在 /Users/yishow/prj/solar_player。
任務：把 [pattern A] 改成 [pattern B]。
動機：[為什麼]。
已確認的修法範例：[貼一個改好的 before/after——唯一標準，不要自行變體]。
目標清單：[明確檔案清單，或 grep pattern]。
邊界規則：遇到不符範例的變體不要硬改，列入「跳過清單」回報。注意 server（.js import）與 web（extensionless）風格不同，不要跨界統一。
驗收條件：
- 全量 grep [pattern A] 為 0（跳過清單除外）。
- pnpm run test 通過；若目標含 apps/server/src/ 頂層檔，另跑對應直跑指令（見 docs/ops/conventions.md）。
回報格式：改動檔數、跳過清單（檔案:行號 + 原因）、檢查指令結果。
```

## 4. 研究 / 外部資訊（agent: general-purpose；model: sonnet）

```
問題：[要回答什麼，越具體越好]。
動機：[答案要拿來做什麼決定——決定挖多深]。
來源要求：框架/函式庫問題（Fastify、Vite、better-sqlite3、node:test、tsx…）優先用 context7 查現行官方文件，其次 WebSearch；每個關鍵結論附來源；區分「文件明說」與「你的推測」。
時效要求：以 2026 年現行版本為準，repo 實際版本以 pnpm-lock.yaml / package.json 為準，不要憑記憶假設 API。
驗收條件：
- 直接回答問題，給建議與信心程度。
- 相互矛盾的來源要指出。
回報格式：結論先行（3 行內）→ 論據；超過 30 行落檔到 [路徑]。
```

## 5. 審查 / 驗收（agent: fresh general-purpose，**不可 fork**；model 與產出者同級或高一級）

```
你在 /Users/yishow/prj/solar_player。你沒有參與產出，請獨立判斷，不要因為產出看起來完整就放行。
任務：驗收 [產出物路徑或 diff 範圍]。
驗收條件（逐條回 通過/不通過/無法判定 + 你自己驗過的證據）：
- [條件 1]
- [條件 2]
檢查方式：
- 程式碼：實際跑 [conventions.md 對照表的指令]，引用真實輸出。注意：pnpm test 不含 apps/server/src/ 頂層測試與 scripts/deploy.test.mjs，涉及時要直跑。
- 文件：只根據文件內容回答「照這份文件你會怎麼做 [X]」，答不出來處即缺陷。
- playback 頁視覺：比對 witness 截圖與 docs/reference/FHD/ 對應 PNG，只回報可觀察差異清單（位置/元素/差在哪），不下「可接受」結論——那是使用者的判定。
特別注意：[已知風險點]。
回報格式：逐條 verdict 表 + 缺陷清單（檔案:行號 + 一句話）。
```

## 6. FHD witness 擷取與比對（本 repo 特有；agent: general-purpose；model: sonnet）

```
你在 /Users/yishow/prj/solar_player。讀 docs/ops/fhd-closeout.md 的「Witness workflow」節與 docs/fhd-witness/evidence-template.md。
任務：對 [五頁中的哪幾頁] 執行 witness 擷取並產出 evidence bundle。
前置：確認 dev/目標環境可達（base-url = [url]）；不可達就回報卡點，不要造假截圖。
步驟：
1. root 跑 pnpm run fhd:witness -- --base-url [url]（可先 fhd:witness:dry-run 演練）。
2. 每頁與 docs/reference/FHD/ 對應 PNG 並排比對，寫 gap notes：位置、元素、差異描述（不下可否接受的結論）。
3. 按 evidence-template.md 填 evidence bundle，落檔到 [路徑]。
驗收條件：
- 每個目標頁都有 fresh 截圖 + gap notes + bundle 條目；缺一頁就標記該頁未完成。
- gap notes 只描述差異，不代使用者判定 intentional/acceptable。
回報格式：bundle 路徑 + 每頁一行摘要（差異數量與最大差異）。
```
