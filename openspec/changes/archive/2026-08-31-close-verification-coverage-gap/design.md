## Context

`pnpm verify` 由 `scripts/verify.mjs` 的 `VERIFY_STAGES` 定義，目前六個 stage 依序為 build、bundle-budget、server、web、deploy、server-runner。spec `repository-verification-entrypoint` 的既有要求寫著 root verification 執行「the complete web suite」，但實際涵蓋範圍有三個缺口：

- `apps/web/scripts/run-tests.mjs` 的 `buildTestRunnerArgs` 在沒有明確 target 時使用單一 glob `src/**/*.test.ts`。Node 的 test runner glob 不把 `.tsx` 視為 `.ts`，因此 53 個 `.test.tsx` 全數落空。以 `fs.globSync` 在 `apps/web` 實測：`.test.ts` 命中 179、`.tsx` 命中 0。
- `packages/shared` 完全不在任何 stage 內。該套件的 package.json 只有 build 與 dev script，devDependencies 只有 typescript，沒有 tsx，因此連手動執行都需要借用其他套件的 toolchain。
- `apps/web/scripts/run-tests.test.mjs` 存在且通過，但 server-runner stage 的參數只列出 `apps/server/scripts/run-tests.test.mjs` 與 `scripts/verify.test.mjs`。

三個缺口合計 66 個測試檔、372 個測試從未執行，其中 9 個是紅的。

`apps/server` 的 discovery 走的是另一條路徑：`apps/server/scripts/run-tests.mjs` 以 `readdirSync` 遞迴走訪並收集 `.test.ts`，不依賴 glob，因此沒有這個問題。它的行為由既有要求「Server test discovery includes top-level and nested tests」約束，本 change 不動它。

## Goals / Non-Goals

**Goals:**

- 66 個測試檔、372 個測試全部進入 `pnpm verify`。
- 打開涵蓋範圍後暴露的 9 個失敗全部變綠。
- 測試失敗以失敗呈現，不以逾時呈現。
- `packages/shared` 的驗證入口不依賴其他套件的 toolchain。
- 保留 lockfile 重新解析出的新版 toolchain，且 `pnpm dev` 不輸出已知的 Fastify／Vite config 相容性警告。

**Non-Goals:**

- 不重構產品程式碼，除非某個失敗確實揭露產品缺陷；即使如此也只做最小改動。
- 不改變既有六個 stage 的相對順序與語意。
- 不新增與涵蓋缺口或新版相容性無關的測試案例，也不追求覆蓋率數字。
- 不動 `apps/server` 的 discovery 實作。
- 不處理 derived metric registry 的 `registryDiagnostics` 缺陷。
- 不搬移 `packages/shared/test` 下的檔案。
- 不回退本次 lockfile 已解析出的新版相依，也不藉此重構 server logging 或 Vite config。

## Decisions

### Web runner 以多個 glob 涵蓋所有測試檔命名形式

`buildTestRunnerArgs` 的預設 target 由單一 glob 改為 `src/**/*.test.ts` 與 `src/**/*.test.tsx` 兩個。Node 的 test runner 接受多個 glob 參數，明確傳入的 argv target 行為維持不變。

**替代方案：** 把 glob 改成 `src/**/*.test.*`。否決原因是會連帶納入未來任何 `.test.` 前綴的檔案（例如快照或固定資料檔），涵蓋範圍變得不可預期；列舉實際使用的兩種副檔名才是明確的契約。

**替代方案：** 比照 server 改用 `readdirSync` 遞迴 discovery。否決原因是那是更大的重寫，而 web runner 目前的 glob 形式只要補上第二個副檔名就正確；本 change 的目標是關閉缺口，不是統一兩套 runner。

### `packages/shared` 取得自己的測試入口與 verify stage

`packages/shared` 新增 tsx 開發相依與 `test` script，script 指向新增的 runner 檔案，比照 `apps/web/scripts/run-tests.mjs` 的形式（含 win32 時以 cmd.exe 包裝 tsx 的既有做法）。預設 target 涵蓋 `src/**/*.test.ts` 與 `test/**/*.test.ts` 兩個目錄。`VERIFY_STAGES` 新增一個 stage 執行該 script。

**替代方案：** 在既有 web stage 內順便執行 shared 測試。否決原因是失敗時無法從 stage 標籤分辨是哪個套件壞掉，違反既有要求「Verification output identifies executed scopes」。

**替代方案：** 不加相依，改由 verify 直接呼叫 web 套件的 tsx 去跑 shared 測試。否決原因是讓 shared 的驗證能力依賴 web 的 toolchain，任何一邊調整都會無聲斷掉。

### 新 stage 置於 server 之前

新的 shared stage 排在 server 與 web 之前、bundle-budget 之後。理由是 shared 是另外兩者的相依來源，先驗證它可以讓失敗訊息指向真正的源頭。`scripts/verify.test.mjs` 有一個測試斷言 stage 的完整順序，該斷言必須同步更新為新的七個 stage 順序。

### 對整份原始碼的 pattern 斷言改為布林斷言

`assert.match` 與 `assert.doesNotMatch` 在失敗時會對受測字串產生 diff。當受測字串是一整份數萬字元的原始碼時，diff 的產生實測會讓測試程序停滯數分鐘，使失敗在 CI 中表現為逾時而非失敗。這類斷言改寫為對 `String.prototype.includes` 結果的 `assert.equal`，並附上說明訊息。

原本未執行的 `DisplayLeafOrnament.test.tsx` 另揭露 shared ornament component 以靜態 module import 載入 PNG，Node/tsx 會在 assertion 前拒絕未知副檔名。built-in 資產改以 Vite 與 Node 都可解析的 `new URL(..., import.meta.url).href` 表達，不新增全域 test loader。

### 每個失敗逐一判定該修哪一邊

打開涵蓋範圍後暴露的失敗不預設是測試的錯。逐一判定並在交付說明中記錄理由：測試斷言的是已被刻意改掉的實作細節就修測試；測試斷言的是仍然成立的契約而程式碼偏離了就修程式碼。無法判定時停下來詢問，不猜。

### 保留新版 toolchain 並消除啟動相容性警告

新增 `tsx` 後重新解析 lockfile，使 Fastify、Vite、TypeScript 與其他既有 `latest` 相依一併更新。依使用者決策保留這批新版，而不是縮回舊版 lockfile；同時只修正新版已明確指出的啟動與安裝相容性寫法。

Fastify 建構選項改以框架匯出的 `LogController` 承載 `disableRequestLogging: true`，維持目前停用 request logging 的行為並移除即將在 Fastify 6 刪除的頂層選項。Vite config 對本地 TypeScript 模組的 import 加上 `.ts` 副檔名，使目前 loader 與 `configLoader: 'native'` 都能解析同一份設定。

TypeScript 7 已移除 `baseUrl`，且 `paths` target 必須使用明確相對路徑。web tsconfig 移除已失效的 `baseUrl`，將既有 devtools alias target 改為 `./src/...`，並在既有 `noEmit` build 契約下啟用 `allowImportingTsExtensions`，讓 Vite config 的明確 `.ts` import 同時通過 TypeScript checker；alias 名稱與實際目標不變。

better-sqlite3 13 已內含 repo 部署涵蓋的 macOS、Linux glibc/musl 與 Windows x64/arm64 native binaries，且套件不再提供 install script；pnpm 因既有 `onlyBuiltDependencies` 仍將它視為需執行 lifecycle，反而 fallback 到未提供的 `node-gyp rebuild`。workspace 設定改為只允許 esbuild lifecycle，並將 better-sqlite3 明確列入 `ignoredBuiltDependencies`，使 frozen install 使用套件內建 binary，不新增 node-gyp 建置依賴。

Vite 8.2 產生的 manifest 會把 playback runtime chunks 表達為 lazy editor subtree 下的 static `imports`，而非每一層都維持 `dynamicImports`。bundle-budget traversal 因此從 entry 的 dynamic edge 開始後，同時追蹤 subtree 的 `imports` 與 `dynamicImports`；initial entry 不得靜態載入 playback runtime 的既有 guard 仍獨立保留，沒有放寬首屏分包契約。

**替代方案：** 壓回舊版 lockfile。否決原因是使用者已決定保留新版，且這只會延後已知相容性修正。

**替代方案：** 以 `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` 或 Node warning suppression 隱藏訊息。否決原因是 Vite native loader 已可實際重現 `ERR_MODULE_NOT_FOUND`，而 Fastify 頂層選項將在 major 版移除；隱藏訊息不會修正契約。

**替代方案：** 新增 node-gyp 讓 better-sqlite3 每次安裝都從原始碼建置。否決原因是 13.0.3 已提供目標平台 binary，額外編譯會增加 Python／編譯器依賴並擴大離線部署風險。

## Implementation Contract

**行為**

1. `pnpm verify` 執行七個 stage，依序為 build、bundle-budget、shared、server、web、deploy、runner，全部通過。
2. web stage 執行的測試數包含原本的 1055 個加上 `.test.tsx` 的 302 個。
3. shared stage 執行 12 個測試檔共 68 個測試。
4. runner stage 額外執行 `apps/web/scripts/run-tests.test.mjs` 的 2 個測試。
5. 任一被納入的測試失敗時，`pnpm verify` 以非零狀態結束，並且輸出可辨識是哪一個 stage 失敗。
6. 原本紅的 9 個測試全部變綠。
7. 新版 Fastify 建構 app 時不輸出 `FSTDEP023`，且 request logging 仍維持停用。
8. Vite config 可由目前 loader 與 `configLoader: 'native'` 載入，不再輸出無副檔名 import 警告或 `ERR_MODULE_NOT_FOUND`。
9. `pnpm install --frozen-lockfile` 不會對 better-sqlite3 13 執行 `node-gyp rebuild`，且安裝後 server 可載入其 bundled native binary。
10. web TypeScript 7 build 不使用已移除的 `baseUrl`，既有 devtools alias 仍解析到同一個 bootstrap module。
11. Vite 8.2 manifest 中位於 lazy subtree 的 playback runtime chunks 仍會被 bundle budget 計入，且 initial entry 靜態載入 guard 維持不變。

**介面與資料形狀**

- `apps/web/scripts/run-tests.mjs` 匯出的 `buildTestRunnerArgs` 在 argv 未指定 target 時回傳同時包含 `src/**/*.test.ts` 與 `src/**/*.test.tsx` 的參數陣列；指定 target 時的行為不變。
- `packages/shared` 新增的 runner 匯出與 web runner 同名的函式（`resolveTestRunnerCommand`、`buildTestRunnerArgs`、`runTests`），預設 target 同時涵蓋 src 與 test 兩個目錄。
- `scripts/verify.mjs` 匯出的 `VERIFY_STAGES` 為七個元素，每個元素保有既有的 label、command、args、shell 欄位形狀。
- Fastify options 透過 `logController: new LogController({ disableRequestLogging: true })` 表達既有 logging 行為；不再使用頂層 `disableRequestLogging`。
- `vite.config.ts` 對 `reactGrabBootstrapTarget` 的本地 import 使用明確 `.ts` 副檔名。
- `pnpm-workspace.yaml` 的 build policy 只允許 esbuild lifecycle，並明確忽略 better-sqlite3 的自動 node-gyp lifecycle。
- web tsconfig 的 `paths` target 使用 `./src/...` 明確相對路徑、不再設定 `baseUrl`，並在 `noEmit` 前提下允許 Vite config import 明確 `.ts` 副檔名。
- `collectReachableManifestKeys` 從 entry dynamic edge 以下同時追蹤 `imports` 與 `dynamicImports`，以符合 Vite 8.2 manifest 形狀。

**失敗模式**

- 某個 glob 未匹配任何檔案時，runner 不得靜默視為成功；這正是本 change 要消除的失敗模式。
- 測試失敗必須在有限時間內以失敗結束，不得因斷言訊息的產生而停滯。
- 不得以 suppress warning 的環境變數掩蓋 Fastify 或 Vite config 相容性問題；native loader 若無法解析 config，驗證必須失敗。
- better-sqlite3 若無 bundled binary 或 server 無法載入，focused runtime probe 必須失敗；不得以成功安裝訊息取代實際 `require("better-sqlite3")` 證據。

**驗收方式**

- `pnpm verify` 全綠，且輸出中可見七個 stage 的 label。
- `apps/web/scripts/run-tests.test.mjs` 新增斷言涵蓋預設 target 同時包含兩種副檔名。
- `scripts/verify.test.mjs` 既有的 stage 順序斷言更新為七個 stage 並通過。
- `scripts/verify.test.mjs` 以最小 manifest fixture 證明 lazy subtree 的 static import 仍在 bundle-budget traversal 內。
- `apps/server/scripts/run-tests.test.mjs` 維持通過，證明 server discovery 未受影響。
- 交付說明逐一列出 9 個失敗各自的判定結果與理由。
- `pnpm install --frozen-lockfile` 完成且 server runtime probe 可載入 better-sqlite3；focused server test 證明 options 使用 `LogController` 且停用 request logging；`pnpm --filter @solar-display/web exec vite build --configLoader native` 成功載入 config；`pnpm dev` 的原生終端 witness 不含兩個已知 warning。

**範圍邊界**

- 在範圍內：三個涵蓋缺口的修補、9 個失敗的修正、上述 runner 與 verify 的測試更新、spec delta、保留新版 lockfile 所需的啟動與 better-sqlite3 安裝相容性修正。
- 不在範圍內：`apps/server` discovery、與相容性契約無關的新測試案例、產品程式碼的非必要改動、`packages/shared/test` 目錄搬移、derived metric registry 的 diagnostics 缺陷、其他 dependency upgrade cleanup。

## Risks / Trade-offs

- 9 個失敗中若有任何一個揭露的是真實產品缺陷，修正範圍可能超出「改測試」的預期 → 逐一判定並在該任務停下來說明，必要時把產品修正拆成獨立 change，不在本 change 內擴張。
- `packages/shared` 新增 tsx 相依會增加安裝體積 → 與 apps/web、apps/server 的既有做法一致，且是讓該套件可獨立驗證的必要成本。
- 新增 stage 會拉長 `pnpm verify` 的時間 → 實測 shared 全套約數百毫秒、web 的 302 個測試約 3 秒，相對於既有的 build stage 可忽略。
- 未來新增其他副檔名的測試檔仍會落在涵蓋範圍外 → 本 change 把兩種實際使用的副檔名寫成明確契約並以 runner 測試釘住，新增第三種時會在 review 時被看見。
- 保留重新解析出的新版相依會帶入比新增 `tsx` 更大的回歸面 → 以兩個 focused 相容性驗證與完整 `pnpm verify` 把已知啟動契約及既有交付 gate 一起鎖住，不在本 change 內順手改其他升版差異。
- better-sqlite3 13 改用 bundled binary，若未來新增未被套件涵蓋的平台會在 runtime load 時失敗 → frozen install 後執行 server runtime probe，現行部署平台皆由套件內 prebuild 清單覆蓋。
