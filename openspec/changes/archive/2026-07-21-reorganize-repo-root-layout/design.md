## Context

目前 repo 的主要產品 monorepo 已經上移到根目錄，`apps/`、`packages/`、workspace manifests、`.env.example`、部署腳本與執行資料路徑都已對齊新的 layout；舊提示詞包、UI 參考與輔助素材也已整理進 `docs/`。但使用者接著補充，這次重整不只要完成目錄搬移，還要把根目錄入口文件補成可直接工作的 repo-specific 指引，並在完成前明確審核 `.gitignore` 與 git 狀態是否乾淨、可解釋。

這使 change 的後半段變成「以實際 codebase 行為回寫文件與 hygiene 規則」：文件內容不能停留在一般性建議，而要忠實反映目前 root scripts、server/web 啟動方式、測試入口、命名與 import 風格、Fastify error handling、runtime 目錄、部署資產與禁止事項。另一方面，repo 重整屬於大規模 rename-heavy 變更，完成前還需要用 fresh git 輸出確認目前 working tree 與最近 commit 狀態沒有異常。

## Goals / Non-Goals

**Goals:**

- 讓主產品從 repo 根目錄即可直接安裝、建置、測試、啟動與閱讀文件。
- 將 `solar-display/` 內的 workspace 結構平移到根目錄，同時修正所有受相對路徑影響的設定與程式碼。
- 保留 Spectra 為正式流程，讓 `README.md`、`AGENTS.md`、`CLAUDE.md` 與 `openspec/` 反映新結構。
- 將非主執行專案內容集中到 `docs/`，使主入口與歷史參考資料分離。
- 以目前程式碼與腳本為依據，補齊 root `README.md`、`AGENTS.md`、`CLAUDE.md` 的 repo-specific 規則。
- 在重整收尾時明確檢查 root `.gitignore` 與 git working tree / commit 狀態，確認結果仍屬可解釋的 rename + targeted edit。

**Non-Goals:**

- 不變更既有 API、資料表、MQTT 業務規則、播放邏輯或頁面功能。
- 不重新撰寫 UI 規範內容，只調整其存放位置與導覽方式。
- 不在本次重整中引入新的建置工具、測試框架或部署平台。
- 不新增 lint / formatter / policy enforcement 機制；本次只整理並回寫既有規則與實際模式。
- 不透過 rewrite history、squash 或 force push 美化 git 歷史；本次只做現況審核與說明。

## Decisions

### Decision: adopt a product-first repository root layout

根目錄將以產品 monorepo 為主體，直接承載 `apps/`、`packages/`、workspace manifest、環境範本與主要開發腳本。這個做法讓 `pnpm install`、`pnpm run dev`、`pnpm run build`、`pnpm run test` 直接在 repo 根目錄成立，避免每次進入專案都先判斷真正的工作目錄。

**Alternatives considered:**
- 保留 `solar-display/` 作為子目錄，只改 README：無法解決路徑與入口分裂問題。
- 改成新的子目錄名稱（例如 `app/`）：比直接上移多一層遷移成本，也無法達成「根目錄即產品」的目標。

### Decision: preserve Spectra at the root and relocate legacy reference material into docs

`openspec/`、root `AGENTS.md`、root `CLAUDE.md` 繼續保留在 repo 正式入口層，因為它們仍是使用者指定的開發流程。相對地，舊提示詞包、UI 參考、歷史規格與輔助素材改整合到 `docs/` 底下，作為次層參考資料，而不是與產品入口並列。

**Alternatives considered:**
- 將 Spectra 也降到 `docs/`：與使用者要求衝突，且會削弱正式流程定位。
- 將舊資料移到 `archive/`：雖可降噪，但使用者明確希望保留為可查閱文件而非封存。

### Decision: update path-sensitive tooling after the move instead of adding compatibility shims

搬移後，所有依賴 `solar-display/` 相對路徑的腳本、設定與程式碼都應直接改到新根目錄結構，而不是額外保留代理目錄、轉址腳本或雙路徑支援。這符合最小長期成本原則，也避免 README、env loader、Vite/Node 執行點出現雙重真相。

**Alternatives considered:**
- 加入暫時性 wrapper 腳本：短期較省事，但會延長混亂期。
- 保留舊 `solar-display/` 空目錄作為轉址：會讓 repo 結構持續模糊，且增加之後清理風險。

### Decision: derive developer entry docs from the observed codebase instead of generic policy

root `README.md`、`AGENTS.md`、`CLAUDE.md` 的內容必須以目前實際存在的工作流與程式碼模式為準，而不是複製通用工程守則。這代表文件要從 root `package.json` scripts、`.env.example`、`apps/server` 的設定與啟動流程、`apps/web` 的開發入口、測試檔案的寫法、Fastify error handler、`deploy/` 資產與 `docs/` 入口等事實出發，整理出這個 repo 真正的建置、測試、命名、error handling、安全與禁止事項。

**Alternatives considered:**
- 只保留高層入口說明，不寫 repo-specific 規則：無法滿足使用者要 agent 直接依根目錄文件工作的需求。
- 直接沿用舊 prompt-package 的規則文字：其中許多敘述已不符合新的根目錄產品結構，也不一定對應目前程式碼。

### Decision: finish with an explicit repository hygiene review

這次變更的完成條件除了 build/test/dev 與文件一致性之外，還要包含 root `.gitignore` 與 git 狀態審核。`.gitignore` 需要覆蓋新的根目錄 layout 會產生的 dependency、build、env、database、logs 與 uploads 產物，但不能誤傷需要保留的 placeholder 或範例檔；git 審核則要用 fresh `git status`、`git diff`、`git log` 輸出確認目前狀態仍可被說明為 rename-heavy reorganization 加上少量 targeted edits，而不是夾帶異常 commit 或遺漏的重要變更。

**Alternatives considered:**
- 將 `.gitignore` 與 git 狀態視為隱含收尾工作：容易在大規模搬移後遺漏，且無法形成可審核的完成證據。
- 只檢查 `git status` 不看 `git log` / `git diff`：無法回答「有沒有多 commit 或少了重要變更」這類歷史與範圍問題。

## Implementation Contract

### Observable behavior

- 在 repo 根目錄執行 `pnpm install` 後，`pnpm run dev`、`pnpm run build`、`pnpm run test`、`pnpm run db:migrate`、`pnpm run db:seed` SHALL 對應到原本 `solar-display/` 的工作區行為。
- Server 啟動後 SHALL 仍從 repo 根目錄附近讀取 `.env`，並維持既有預設埠、資料庫、logs 與 uploads 路徑語意。
- Root `README.md` SHALL 成為單一開發入口，清楚說明專案總覽、目錄布局、建置/測試/執行指令、環境變數、runtime 資料目錄、部署入口、`docs/` 導覽與 Spectra 工作流。
- Root `AGENTS.md` 與 `CLAUDE.md` SHALL 說明新結構下的 repo-specific 規則，至少涵蓋目前可觀察到的測試入口、命名與 import 風格、error handling pattern、安全考量、禁止事項與工作邊界，而不是停留在舊提示詞包描述或通用工程宣言。
- Root `.gitignore` SHALL 覆蓋新的根目錄 layout 會產生的常見本機/runtime/build 產物，同時保留必須追蹤的 placeholder 或範例檔。
- 完成前 SHALL 產出一份基於 fresh git 輸出的 working tree / recent commits 審核結論，說明目前狀態是否屬可解釋的 rename-heavy + targeted edit reorganization，並指出是否存在異常多出的 commit 或漏掉的重要變更。

### Interface and data shape expectations

- Workspace manifest 應維持單一 pnpm workspace，套件名稱 `@solar-display/server`、`@solar-display/web`、`@solar-display/shared` 不變。
- root scripts 的正式入口仍為 `dev`、`dev:web`、`dev:server`、`build`、`test`、`db:migrate`、`db:seed`；文件不得發明不存在的指令名稱。
- 文件提到的 runtime 位置應對應目前實作：`data/`、`uploads/`、`logs/`、`deploy/`、`docs/`、`openspec/` 與 root `.env.example`。
- repo-specific 規則必須能回指到目前程式碼模式，例如 TypeScript ESM import、Fastify 錯誤回應形狀、server/web 測試與啟動入口，而不是抽象政策。
- git 審核輸入至少包含 `git status --branch --short`、`git diff --stat`、`git diff --cached --stat` 與 `git log --oneline --decorate -n 12` 這類可重跑的命令輸出。

### Failure modes and boundaries

- 若文件聲稱存在某個測試規則、命名規則、錯誤處理或安全機制，但目前 repo 內找不到對應事實，這屬於未完成狀態；應修正文案，不得以「最佳實務」名義憑空補上。
- 若搬移後仍有腳本或程式碼依賴舊 `solar-display/` 前綴，這屬於未完成狀態，必須在同一 change 內修正，而不是留待後續人工判斷。
- 若 `.gitignore` 過度寬鬆而吞掉應追蹤的檔案，或過度寬鬆以外的忽略規則導致 runtime 噪音仍混入 working tree，這屬於本 change 的直接缺陷。
- git working tree / commit 審核必須基於當下 fresh 輸出，不得依賴先前記憶或舊摘要代替。
- 本 change 不處理與重整無直接關係的既有功能性 bug，也不要求重寫 git 歷史來讓 diff 看起來更整齊。

### Acceptance criteria

- `pnpm run build` 與 `pnpm run test` 可從 repo 根目錄成功執行。
- 啟動開發環境時，web 與 server 仍能依原有腳本從新根目錄運作。
- `README.md`、`AGENTS.md`、`CLAUDE.md` 的敘述與實際 repo 結構、scripts、測試入口與程式碼模式一致。
- root `.gitignore` 已涵蓋新的根目錄 layout 常見產物，且未誤傷應追蹤檔案。
- fresh git 審核能說明目前 working tree 與 recent commits 是否正常，並明確指出是否存在多餘 commit 或漏掉的重要變更。
- `spectra analyze reorganize-repo-root-layout` 與 `spectra validate reorganize-repo-root-layout` 通過。

### Scope boundaries

**In scope:** 目錄搬移、路徑修正、工作區腳本修正、文件入口重寫、歷史資料重整至 `docs/`、以現有 codebase 行為回寫 repo-specific 文件、`.gitignore` 補強、git working tree / commit 狀態審核。

**Out of scope:** 新功能開發、商業邏輯重寫、測試框架更換、部署架構升級、移除 Spectra 流程、引入新的政策 enforcement 工具、重寫 git 歷史。

## Risks / Trade-offs

- [文件規則過度一般化] → 只記錄能從目前 scripts、設定、測試與程式碼直接觀察到的規則，避免發明 repo 並未落實的政策。
- [`.gitignore` 規則過寬] → 逐項檢查 runtime/build/local artifacts，並保留像 `uploads/images/.gitkeep` 這類必要 placeholder。
- [git 審核只看單一指令得出錯誤結論] → 以 status、diff、cached diff 與 recent log 交叉比對目前狀態。
- [文件與程式碼之後再度漂移] → 在這次重整中先建立 root 文件作為正式入口，後續若工作流改變再透過 Spectra 同步更新。

## Migration Plan

1. 先重塑根目錄結構與文件目標位置，確立 `docs/` 容器與最終 layout。
2. 將 `solar-display/` 內的 workspace/app/package/config 實體搬移到根目錄對應位置。
3. 修正所有受影響的相對路徑、腳本與程式設定。
4. 重寫 root `README.md`、`AGENTS.md`、`CLAUDE.md`，並整理舊資料到 `docs/`。
5. 以目前 scripts、設定、測試與 deploy 資產交叉檢查文件內容，確保 repo-specific 規則來自可觀察事實。
6. 以 build/test/dev 指令與 `.gitignore` / git 狀態審核完成重整收尾，再清除空的舊目錄。

## Open Questions

- (none)