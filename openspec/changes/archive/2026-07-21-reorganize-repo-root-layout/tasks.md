## 1. 重塑產品根目錄

- [x] 1.1 依照 Decision: adopt a product-first repository root layout 將 `solar-display/` 的 workspace manifests、`apps/`、`packages/` 與必要執行資產平移到 repo 根目錄，交付 Product workspace lives at the repository root；以根目錄 tree 檢查與 `test -f package.json && test -d apps/server && test -d apps/web && test -d packages/shared` 驗證。
- [x] 1.2 更新根目錄與各 package manifest，讓 Root commands execute the product workflow 並符合 Interface and data shape expectations；以 `pnpm run build`、`pnpm run test`、`pnpm run db:migrate --help || pnpm run db:migrate` 的成功執行驗證。
- [x] 1.3 依照 Decision: update path-sensitive tooling after the move instead of adding compatibility shims 修正 env loader、Vite、server 啟動點與靜態/資料路徑，交付 Path-sensitive configuration is updated to the new root layout 並覆蓋 Failure modes and boundaries；以 `pnpm run dev` 啟動檢查與 server/web 不再依賴 `solar-display/` 前綴的路徑搜尋驗證。

## 2. 重整文件與流程入口

- [x] 2.1 將舊提示詞包、UI 參考、歷史規格與輔助素材整理到 `docs/`，交付 Historical reference material is organized under docs，並落實 Decision: preserve Spectra at the root and relocate legacy reference material into docs；以 `find docs -maxdepth 3` 結果與 docs 索引內容檢查驗證。
- [x] [P] 2.2 重寫 root `README.md`，讓 Root README is the single developer entry document 並反映 Observable behavior；以文件內容檢查確認包含專案總覽、根目錄指令、目錄布局、設定前置條件與 Spectra/`docs/` 導覽。
- [x] [P] 2.3 重寫 root `AGENTS.md` 與 root `CLAUDE.md`，讓 Root workflow instructions match the reorganized repository，並清楚標示 Scope boundaries；以文件內容檢查確認它們把 repo 根目錄描述為正式工作目錄、保留 Spectra 正式流程且移除舊 prompt-package 主入口敘述。

## 3. 收斂清理與驗證

- [x] 3.1 清除已失效的 `solar-display/` 包裝層與過時文件引用，交付 Acceptance criteria；以 `rg "solar-display/" README.md AGENTS.md CLAUDE.md docs apps packages package.json pnpm-workspace.yaml` 僅剩歷史說明、再執行 `pnpm run build`、`pnpm run test` 與人工確認根目錄為唯一產品入口驗證。

## 4. 補強開發入口文件與 repo hygiene 檢查

- [x] [P] 4.1 依照 Decision: derive developer entry docs from the observed codebase instead of generic policy 補強 `README.md`，讓 Root README is the single developer entry document，涵蓋專案總覽、根目錄指令、環境設定、runtime 資料位置、部署入口與 Spectra/`docs/` 導覽；以文件內容檢查並逐項對照 `package.json`、`.env.example`、`deploy/` 驗證。
- [x] [P] 4.2 依照 Decision: derive developer entry docs from the observed codebase instead of generic policy 重寫 root `AGENTS.md` 與 root `CLAUDE.md`，讓 Root workflow instructions match the reorganized repository 與 Developer entry documents reflect observed implementation conventions，明確寫出測試入口、命名與 import 規則、error handling pattern、安全考量、禁止事項與 repo-specific 規則；以文件內容檢查並對照目前 root scripts、`apps/server`、`apps/web`、`packages/shared` 與 `deploy/` 的實際模式驗證。
- [x] [P] 4.3 依照 Decision: finish with an explicit repository hygiene review 檢查 root `.gitignore`，讓 Repository ignore rules cover root runtime and build artifacts，涵蓋 dependency/build/env/log/database/upload 產物且保留必要 placeholder；以 `.gitignore` 內容檢查與 `git status --ignored --short` 驗證。
- [x] 4.4 依照 Decision: finish with an explicit repository hygiene review 審核 git 狀態，讓 Repository working tree review confirms explainable reorganization state，確認 rename-heavy + targeted edit 狀態可解釋且沒有異常多出的 commit 或漏掉的重要變更；以 `git status --branch --short`、`git diff --stat`、`git diff --cached --stat` 與 `git log --oneline --decorate -n 12` 驗證。
