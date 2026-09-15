# Docs Guide

這個目錄放補充文件、維運資料、FHD closeout artifacts 與歷史參考。產品總覽以 repo 根目錄 `README.md` 為入口；行為契約與 change 狀態以 `openspec/` 為準；repo 工作規則以 `docs/ops/` 為準。

## Start Here

| 你要做什麼 | 先看哪裡 |
| --- | --- |
| 第一次進 repo，想知道產品、指令、部署入口 | repo 根目錄 `README.md` |
| 要開始實作或修正，先確認工作流與驗證 | `ops/workflow.md`、`ops/conventions.md` |
| 要查正式規格、已授權 change 或 tasks | `../openspec/specs/`、`../openspec/changes/` |
| 要處理 playback / FHD closeout、witness、visual canonicals | `reference-match/fhd-workflow-entrypoints.md`、`reference-match/playback-visual-canonicals.md`、`reference-match/display-launch-witness-matrix.md`、`fhd-witness/playback-closeout-matrix.md`、`fhd-witness/evidence-template.md` |
| 要做維運、部署、裝置處理 | `runbooks/` 與 repo 根目錄 `deploy.md` |
| 要查 server 對外 API 契約 | `openapi.yaml` |
| 要看過去的 review、roadmap 或歷史資料 | `reviews/`、`roadmaps/`、`archive/` |

## Folder Map

| 位置 | 內容角色 | 新文件應放這裡的情境 |
| --- | --- | --- |
| `ops/` | repo 工作制度、驗證入口、風險判斷、FHD closeout routing | 穩定流程、慣例、守門規則 |
| `runbooks/` | 人工或 operator 需要照著做的程序文件 | 可重複執行的維運、部署、裝置操作 |
| `reference-match/` | FHD / playback 的 canonical workflow、launch gates 與 supporting input | 視覺契約、witness/evidence 入口與目前仍在流程中的 supporting docs |
| `archive/reference-match/` | 已歸檔的 FHD audit、checklist、witness evidence 與 refinement trace | 舊 closeout 證據、handoff 與 dated supporting docs |
| `fhd-witness/` | FHD witness matrix、evidence template 與實際 runs | 要保存 witness 產物或 closeout evidence |
| `architecture/` | 較穩定的技術設計與 runtime profile 說明 | 架構級說明，不是一次性計畫 |
| `reviews/` | 有日期的 review、audit、follow-up 結論 | 一次性的檢查報告或審查記錄 |
| `roadmaps/` | 有日期的未來規劃與重整提案 | 尚未成為正式 spec 的中期規劃 |
| `display-assets/` | display page 資產生成規範、manifest 模板與 recipes | 素材規格、產製流程、資產 QA 規則 |
| `reference/` | 歷史規格、prototype、設計參考與補充素材 | 只供參考、不作現行契約來源的資料 |
| `agents/` | agent 協作用文件與分類詞彙 | 僅在 agent workflow 真的會消費它時 |
| `superpowers/` | 額外能力或設計規格草稿 | 特定 capability 的補充規格 |
| `archive/` | 已退出主工作流但仍需保留的歷史文件 | 被新入口取代、但不能直接刪除的舊文件 |
| `downloads/` | 壓縮包、匯出附件、外來資料 | 不適合直接納入一般 docs 結構的下載產物 |

## Standalone Files

- `openapi.yaml`：server 目前維護的 authoritative critical-operation subset。

## Placement Rules

1. 穩定制度放 `ops/`，不要把 workflow 規則散落在 dated review 或 roadmap。
2. 可重複執行的人工步驟放 `runbooks/`，避免藏在 issue 式筆記或 handoff 文內。
3. FHD closeout 的 canonical 規則、exception、witness 與 launch gate 放 `reference-match/` 或 `fhd-witness/`，不要另開平行入口。
4. 一次性的審查結論放 `reviews/`，未來規劃放 `roadmaps/`；兩者都應帶日期。
5. 已被新入口取代但仍需保留的內容移到 `archive/`，不要繼續佔用主入口。
6. `docs/README.md` 只做導覽與放置規則，不重述完整產品說明或 spec 內容。

## Current Reading Paths

- 想處理 repo 層工作流：先看 `ops/workflow.md`，再看 `ops/conventions.md`。
- 想處理 FHD / playback：先看 `reference-match/fhd-workflow-entrypoints.md`。
- 想處理裝置或部署：先看 `runbooks/` 裡對應主題，再回到 repo 根目錄 `deploy.md` 與 `deploy/` 腳本。
- 想查歷史背景：先確認那份資料是否只是 `reference/` 或 `archive/` 參考，避免把它誤當現行契約。
