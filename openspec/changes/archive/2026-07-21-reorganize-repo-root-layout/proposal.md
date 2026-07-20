## Why

目前可執行的產品程式碼集中在 `solar-display/`，但 repo 根目錄仍以提示詞規格包與流程文件為主，導致專案入口、建置指令、實際目錄結構與開發文件彼此脫節。隨著 `solar-display` 已從早期骨架演進為可建置、可測試、可部署的主產品，現在需要把 repo 重整為「產品優先」的結構，讓人類開發者與 AI agent 都能從根目錄直接理解並操作專案。

## What Changes

- **BREAKING** 將 `solar-display/` 內的 pnpm workspace、apps、packages、環境設定與相關執行資產上移到 repo 根目錄。
- 重新定義 repo 根目錄結構，讓主程式、規格流程、參考文件各自有清楚且穩定的位置。
- 保留 Spectra 作為正式開發流程，並將 `openspec/`、root `AGENTS.md`、root `CLAUDE.md` 更新成符合新結構的內容。
- 將非主執行專案內容整理進 `docs/`，降低歷史提示詞、參考素材與主產品入口混雜的情況。
- 更新 root `README.md`，使其成為新的單一開發入口，包含專案總覽、建置/測試/執行方式、環境設定、部署入口與 repo-specific 規則。
- 深度分析目前 codebase，將實際存在的程式碼樣式、測試方式、安全考量、命名規則、error handling pattern、測試要求、禁止事項與其他 repo-specific 規則回寫到 `README.md`、`AGENTS.md`、`CLAUDE.md`。
- 檢查 root `.gitignore` 是否涵蓋常見本機/runtime/build 產物，避免重整後遺漏新的根目錄忽略規則。
- 盤點並修正因路徑上移造成的工作區設定、腳本、文件路徑、靜態資產路徑與引用關係。
- 審核目前 git working tree 與最近 commit 狀態，確認這次重整屬於可解釋的 rename + targeted edit 狀態，沒有異常多出的 commit 或漏掉的重要變更。

## Non-Goals (optional)

- 不在本次重整中新增產品功能、頁面或 API 行為。
- 不重新設計既有業務邏輯、資料模型或 UI 規格內容。
- 不移除 Spectra 流程，只調整其在新 repo 結構中的位置與說明。

## Capabilities

### New Capabilities

- `repository-root-layout`: 定義產品優先的 repo 根目錄結構，規範主程式、流程規格與參考文件的存放位置，以及從根目錄直接建置、測試與執行 monorepo 的要求。
- `developer-entry-docs`: 定義 root `README.md`、`AGENTS.md`、`CLAUDE.md` 在重整後應提供的開發入口資訊、工作流規則、程式碼樣式、測試要求、安全考量、命名與 error handling pattern 等 repo-specific 操作指引。
- `repository-hygiene-review`: 定義重整完成前應執行的 `.gitignore` 補強與 git working tree / commit 狀態審核要求。

### Modified Capabilities

(none)

## Impact

- Affected specs: `repository-root-layout`, `developer-entry-docs`, `repository-hygiene-review`
- Affected code:
  - Modified: `README.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore`, `openspec/config.yaml`, `package.json`, `pnpm-workspace.yaml`, `.env.example`, `apps/server/package.json`, `apps/server/src/app.ts`, `apps/server/src/config.ts`, `apps/server/src/env.ts`, `apps/server/src/server.ts`, `apps/server/src/fastify.ts`, `apps/web/package.json`, `apps/web/vite.config.ts`, `packages/shared/package.json`, `deploy/deploy.sh`, `deploy/solar-display.service`
  - New: `docs/README.md`, `openspec/changes/reorganize-repo-root-layout/specs/repository-hygiene-review/spec.md`
  - Removed: `solar-display/`, `solar-display/README.md`
