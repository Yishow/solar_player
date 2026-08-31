## Why

`pnpm verify` 是本 repo 的交付 gate，但它從未執行過 66 個測試檔、共 372 個測試。實測（於 commit f7c6165a 的乾淨工作區）：`apps/web` 的 53 個 `.test.tsx` 共 302 個測試從未執行、其中 6 個失敗；`packages/shared` 的 12 個測試檔（11 個在 src、1 個在 test 目錄）共 68 個測試從未執行、其中 3 個失敗；`apps/web` 測試 runner 自己的 2 個測試也不在任何 stage 內。

不執行的測試會靜靜腐爛。`apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx` 斷言 Overview 原始碼包含某個字串 pattern，而該原始碼早已改寫——這個測試自那次改寫起就是紅的，沒有人知道。一道宣稱涵蓋「the complete web suite」卻漏掉 23% 測試檔的 gate，比沒有 gate 更危險，因為它讓人以為已經驗證過。

## What Changes

- `apps/web` 的測試 runner 涵蓋 `.test.tsx`，53 個檔案 302 個測試進入 `pnpm verify`。
- `packages/shared` 取得可執行的測試入口，並成為 `pnpm verify` 的一個 stage，12 個檔案 68 個測試進入 gate；入口需同時涵蓋 src 與 test 兩個目錄。
- `apps/web` 測試 runner 自己的測試比照 server runner 納入既有的 runner stage。
- 上述涵蓋範圍打開後暴露的 9 個失敗全部變綠，逐一判定該修測試或該修產品程式碼並在交付時說明判定理由。
- 對整份原始碼做 pattern 斷言的測試改為布林斷言，使失敗以失敗呈現而非以逾時呈現。
- 保留新增 `tsx` 後重新解析出的新版 toolchain 與 lockfile；同步修正 Fastify、Vite config、Vite 8.2 manifest bundle-budget traversal 與 better-sqlite3 安裝策略的既有相容性寫法，使新版 frozen install、build 與 verification 可完成，且 `pnpm dev` 不再輸出 `FSTDEP023` 或 native config loader 警告。

## Non-Goals

- 不重構被這 9 個失敗觸及的產品程式碼，除非該失敗確實揭露了產品缺陷；即使如此也只做讓該測試變綠所需的最小改動。
- 不改變既有 6 個 verify stage 的相對順序與語意。
- 不新增與涵蓋缺口或新版相容性無關的測試案例。本 change 的產出是「既有測試開始被執行且全綠」，不是擴充產品測試覆蓋率。
- 不處理 derived metric registry 的 `registryDiagnostics` 在定義儲存後不再重建的缺陷。該缺陷位於 server 程式碼，而 server 測試本來就在 gate 內，與本涵蓋缺口沒有因果關係，應另開 change。
- 不調整 `apps/server` 的測試 discovery。它已由既有要求涵蓋且運作正常。
- 不搬移 `packages/shared/test` 目錄下的測試檔到 src；讓入口同時涵蓋兩個目錄即可。
- 不回退本次 lockfile 已解析出的 Fastify、Vite、TypeScript 或其他新版相依。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `repository-verification-entrypoint`：現有要求宣稱 root verification 執行「the complete web suite」，但 web runner 的預設 glob 不匹配 `.test.tsx`，且整個 `packages/shared` 不在任何 stage 內。要求需明確涵蓋所有測試檔命名形式與 shared 套件。

## Impact

- Affected specs：`repository-verification-entrypoint`
- Affected code:
  - Modified:
    - `apps/web/scripts/run-tests.mjs`
    - `apps/web/scripts/run-tests.test.mjs`
    - `scripts/verify.mjs`
    - `scripts/verify.test.mjs`
    - `packages/shared/package.json`
    - `apps/server/src/app.ts`
    - `apps/server/src/logger.test.ts`
    - `apps/web/vite.config.ts`
    - `apps/web/tsconfig.json`
    - `pnpm-workspace.yaml`
    - `scripts/check-web-bundle-budget.mjs`
    - `apps/web/src/pages/Overview/configRender.test.tsx`
    - `apps/web/src/pages/shared/DisplayLeafOrnament.tsx`
    - 另有 8 個承載其餘失敗的測試檔，其確切路徑於實作時由測試輸出確定
  - New:
    - `packages/shared/scripts/run-tests.mjs`
  - Removed:（無）
- 交付後 `pnpm verify` 的 stage 數由 6 增為 7，執行的測試總數增加 372 個。
- `packages/shared` 需新增 tsx 開發相依，與 apps/web、apps/server 的既有做法一致。
- 保留 lockfile 重新解析出的新版 toolchain；Fastify logging options 與 Vite config import 必須符合目前版本及 Vite native config loader 的契約。
