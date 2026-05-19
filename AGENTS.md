# Agent 工作指引

## 正式工作目錄與入口

- 本 repo 根目錄就是正式產品工作目錄；直接從 root 執行 `pnpm`、讀 `package.json`、看 `apps/`、`packages/`、`deploy/`、`openspec/`。
- 不要再把 `solar-display/`、舊 prompt package、或 `docs/` 裡的歷史資料當成主要入口。
- 產品 monorepo 目前以 root `package.json` 為準，正式 workspace package 是 `@solar-display/server`、`@solar-display/web`、`@solar-display/shared`。
- 做瀏覽器測試用 agent-browser skill。

## 先看哪些地方

- `openspec/`：正式需求、change artifacts、任務勾選狀態。若使用 Spectra，先看這裡。
- `apps/server/`：Fastify API、MQTT、SQLite migration/seed、runtime services。
- `apps/web/`：Vite + React 前端。
- `packages/shared/`：server/web 共用型別與 playback 邏輯。
- `deploy/`：目前部署腳本與 systemd service，代表 production 假設。
- `docs/`：歷史提示詞、UI 參考、舊規格與輔助素材；可查，但不是主要真相來源。

## 正式流程：Spectra

本專案持續使用 Spectra 作為正式工作流程。

- 需求整理或決策：`/spectra-discuss`
- 建立或更新 change：`/spectra-propose`
- 依既有 tasks 實作：`/spectra-apply`
- 規格需回補時：`/spectra-ingest`
- 查詢 specs / changes / 規則：`/spectra-ask`
- 完成後封存：`/spectra-archive`
- 只提交特定 change 相關檔案：`/spectra-commit`

工作流：`discuss? → propose → apply ⇄ ingest → archive`

## 目前真的存在的指令與測試入口

- Root 開發入口以 `package.json` scripts 為準：`pnpm run dev`、`dev:web`、`dev:server`、`build`、`test`、`db:migrate`、`db:seed`。
- Root `test` 目前只會跑 server 與 web：`pnpm --filter @solar-display/server test && pnpm --filter @solar-display/web test`。不要宣稱 repo 有 lint、CI gate、e2e pipeline 或其他不存在的檢查。
- Server 測試入口是 `apps/server/package.json` 的 `tsx --test src/**/*.test.ts`。
- Web 測試入口是 `apps/web/package.json` 的 `tsx --test src/**/*.test.ts`。
- `packages/shared` 目前有 build/watch，但沒有 root-level test script；若修改 shared，至少確認 build 與受影響的 server/web tests。

## 觀察到的程式碼慣例

### 命名與 import

- 套件名稱維持 `@solar-display/*`。
- Server 端 TypeScript 是 ESM 風格，relative import 目前使用 `.js` 副檔名，例如 `./config.js`、`../db/index.js`；編輯 `apps/server/src/` 時跟隨這個模式。
- Web 端目前使用 extensionless relative imports，例如 `./playbackRouteNavigation`、`../services/api`；不要把 server 的 `.js` import 風格硬套到 `apps/web/src/`。
- 共用匯出目前由 `packages/shared/src/index.ts` 集中轉出；若新增跨 package 共用型別或 playback 工具，優先沿用這個入口。

### 錯誤處理與回應形狀

- Server 的 Fastify app 在 `apps/server/src/app.ts` 統一處理未命中路由與未捕捉錯誤；API 錯誤回應目前常見形狀是 `{ success: false, error, timestamp }`。
- 500 類錯誤在 `setErrorHandler` 會回傳 `Internal Server Error`，不要把內部細節直接暴露給 client。
- 啟動流程在 `apps/server/src/server.ts`：會先 migrate/seed，再建立 app，MQTT 初次連線失敗只記 warn，不會阻止 server 啟動。
- 在 server 程式中優先使用 `app.log` / Fastify logger；`console.error` 目前只出現在 app 尚未建立前的啟動失敗路徑，`debug-multipart.ts` 屬例外工具腳本，不要把它當成一般模式。

### 安全與 runtime 假設

- `.env` 由 `apps/server/src/server.ts` 搭配 `resolveEnvFilePath()` 載入；預設資料位置來自 `apps/server/src/config.ts`：`data/`、`uploads/images`、`docs/openapi.yaml`、`apps/server/src/db/migrations`。
- `.env.example` 已列出目前支援的 server / MQTT / logging / web 變數；新增設定前先確認是否真的有對應實作。
- `apps/server/src/routes/images.ts` 目前只接受 `.jpg`、`.jpeg`、`.png`、`.webp`，且上傳大小上限為 10MB；不要在文件中省略這些現有限制。
- `apps/server/src/routes/settings-mqtt.ts` 對外回傳 MQTT 設定時會把密碼遮成 `****`；若修改這段行為，必須維持不直接回傳明文密碼。
- `apps/server/src/routes/device.ts` 明確把 reboot API 保持停用，提示改用 `systemctl restart solar-display`；不要把危險裝置操作包裝成預設可用功能。
- `deploy/solar-display.service` 啟用 `NoNewPrivileges=true`、`ProtectSystem=strict`，並只開放 `data`、`logs`、`uploads/images` 可寫；若調整 runtime 目錄或部署假設，要同步檢查 `deploy/`。

## 禁止事項

- 不要發明 repo 目前沒有的 lint、formatter、CI、deploy 平台或測試流程，文件與指引只能描述現況。
- 不要重新引入 `solar-display/` 路徑前綴、wrapper 目錄或雙重入口說法。
- 不要把 `docs/` 的歷史文件改寫成正式規格來源，除非任務明確要求。
- 不要隨手改動 `deploy/`、runtime 路徑、systemd 假設或 `.env.example`，除非本次任務直接涉及那些行為。

## 工作邊界

- 預設只修改目前 task / change 直接要求的檔案；不要順手重構無關模組。
- 若文件、規格與現況衝突，優先回到 root scripts、`apps/server`、`apps/web`、`packages/shared` 與 `deploy/` 查實作，再決定是否更新 artifact。
- 若要描述 repo 規則，必須能回指出目前實際檔案或行為；找不到事實支撐時，應刪掉該規則，而不是補上通用政策。


<claude-mem-context>
# Memory Context

# [solar_player] recent context, 2026-05-19 8:33pm GMT+8

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (10,175t read) | 250,241t work | 96% savings

### May 19, 2026
199 3:11p 🔵 User feedback on /overview page aesthetics
200 3:51p 🔴 Fix TypeError in Overview ViewModel
201 3:53p 🔵 TypeError in Overview ViewModel
202 4:16p 🔵 Runtime TypeError in Overview Page ViewModel
203 4:20p 🔵 TypeError in Overview ViewModel
204 4:22p 🔵 TypeError in Overview ViewModel
206 " 🔵 Display Page Editor Tests Pass
205 4:23p 🔵 TypeError in Overview ViewModel
207 4:26p 🔵 TypeError in Overview ViewModel
208 4:33p 🔵 TypeError in Overview ViewModel
209 4:34p 🔵 TypeError in Overview Page ViewModel
210 4:42p 🔴 Fix TypeError in Overview ViewModel
211 4:44p 🔴 Fix TypeError in Overview ViewModel
212 4:47p 🔵 TypeError in Overview ViewModel
213 5:02p 🔴 Fix TypeError in Overview ViewModel
214 5:15p 🔵 Session Initialization
216 5:18p ✅ Update project guidelines for server logging
215 5:19p 🔵 Claude-Mem session initialized
217 5:44p ✅ Center-align numerical values in UI
218 5:48p ⚖️ Initiate proposal drafting using spectra-propose
220 5:56p 🔵 Inspection of Solar Display Page Test Config
219 5:57p 🔵 TypeError in Overview ViewModel
221 6:00p 🔵 TypeError in Overview ViewModel
222 6:04p 🔵 TypeError in Overview ViewModel
223 6:07p 🔵 TypeError in Overview ViewModel
224 6:08p 🔵 TypeError in Overview ViewModel
225 6:15p 🔵 TypeError in Overview Page ViewModel
226 6:16p 🔴 Fix TypeError in Overview ViewModel
227 6:17p 🔵 TypeError in Overview ViewModel
228 6:27p 🔵 TypeError in Overview ViewModel
229 6:35p 🔵 TypeError in Overview ViewModel
230 6:36p 🔵 TypeError in Overview ViewModel
231 6:37p 🔴 Fix TypeError in Overview ViewModel
232 6:38p 🔵 TypeError in Overview ViewModel
233 6:41p 🔵 TypeError in Overview ViewModel
234 6:43p 🔵 TypeError in Overview ViewModel
235 6:44p 🔵 TypeError in Overview ViewModel
236 6:48p 🔵 TypeError in Overview ViewModel
237 7:24p 🔴 Fix TypeError in Overview ViewModel
238 7:26p 🔴 Fix TypeError in Overview ViewModel
239 7:28p 🔵 TypeError in Overview Page ViewModel
240 7:33p 🔴 Fix TypeError in Overview ViewModel
241 7:43p 🔴 Fix TypeError in Overview ViewModel
242 7:54p 🔵 Solar Power System Deep Analysis Request
243 7:57p 🔵 TypeError in Overview ViewModel
244 7:58p 🔵 TypeError in Overview ViewModel
245 8:18p 🔵 TypeError in Overview ViewModel
246 8:19p 🔵 TypeError in Overview ViewModel
247 8:24p 🔴 Fix TypeError in Overview ViewModel
248 8:25p 🔴 Fix TypeError in Overview ViewModel

Access 250k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>