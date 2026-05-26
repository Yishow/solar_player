## Context

目前 repo 已經有 reference prototype、page-by-page alignment artifacts、display visual checklist，以及一些 guardrail tests，但 AI 做前端時還是容易出現三種退化：

- 一次改太多 surface family，最後 reviewer 很難看出哪裡是 layout、哪裡是 runtime、哪裡只是視覺
- 只憑本地畫面感覺收斂，沒有 witness batch 與例外記錄，導致後續 drift 難追
- build/test 通過後就算完成，但真正的 FHD 質感、距離感與 playback versus management 邊界沒有被驗證

這表示缺的不是更多設計詞，而是一條 AI 專用的 FHD frontend workflow。

## Goals / Non-Goals

**Goals:**

- 要求 AI 在 FHD 前端變更前先定義 witness batch 與 surface family
- 為每個 FHD 相關 change 建立 evidence bundle、exception ledger 與 verification pack
- 讓 canonical docs、templates、hook 與 Spectra artifact 指向同一套工作流

**Non-Goals:**

- 不在此 change 內重做任何單一頁面的實作
- 不要求引入外部 screenshot diff service 或設計審查平台
- 不把所有 frontend 變更都提升成 FHD workflow；只針對會影響 FHD 視覺或播放體驗的變更
- 不在此 change 內同步 `AGENTS.md`、`CLAUDE.md`、`README.md` 或 repo-local skill 入口文件；那些入口文件的責任對齊由專門 change 處理

## Decisions

### Require evidence bundles for every FHD-affecting frontend change

決策：凡是變更 playback visuals、shared display chrome、editor integrated workspace 視覺、management FHD witness 頁，AI 都必須產出 evidence bundle，至少包含 witness batch、受影響 surface、before/after 檢查點、例外說明與 verification pack。

理由：沒有 evidence bundle，review 很容易退化成「感覺差不多」。

替代方案：

- 只要求 PR 文字描述。拒絕原因：太鬆，無法穩定阻止 drift。

### Split FHD work by witness batch and surface family

決策：要求 AI 先把 change 切成 playback witness batch、management/reference batch、editor integrated workspace batch、launch audit batch 等 surface family，不允許在單一 change 中混合多種高風險視覺 concern。

理由：同一個 change 同時碰 geometry、token、runtime、editor 通常最容易讓質感與功能一起退化。

替代方案：

- 讓 AI 自由決定 batch。拒絕原因：過去經驗顯示它會傾向做大 diff。

### Record exceptions instead of allowing silent local optimizations

決策：若 AI 為了可用性、資料限制或現有 contract 而偏離 witness，必須留下 exception ledger，記錄頁面、區塊、偏離原因、替代效果與後續風險。

理由：FHD 品質變差常不是因為單次大錯，而是許多沒有留下痕跡的小妥協累積而成。

替代方案：

- 只在 code review 口頭說明。拒絕原因：無法累積 project memory，也無法給下一個 change 使用。

## Implementation Contract

- Behavior:
  - 任何 FHD 相關 frontend change 在 proposal/design/tasks 或對應 docs 中，都能明確指出 witness batch、surface family、evidence bundle、exception ledger 與 verification pack。
  - 後續 AI workflow 會因為 canonical docs / templates / hook 指引而先切 scope，再開始寫實作；agent 與 human entrypoints 則在獨立 change 中引用這套 workflow。
- Interface / data shape:
  - 新 spec `ai-frontend-fhd-evidence-workflow` 定義 workflow contract。
  - `docs/reference-match/fhd-evidence-bundle-template.md` 提供 evidence bundle 模板。
  - `docs/reference-match/fhd-surface-split-guide.md` 定義如何切 witness batch 與 surface family。
  - `docs/reference-match/fhd-exception-ledger-template.md` 定義例外記錄格式。
  - `.codex/hooks.json` 可提供與相關路徑綁定的輕量提醒或檢查，但不接管完整 entrypoint 文案。
- Failure modes:
  - 若 change 沒有 witness batch 或 evidence bundle，視為 FHD review 前置資料不足。
  - 若 change 混合多個高風險 surface family 而沒有拆分理由，視為高 drift 風險。
- Acceptance criteria:
  - `spectra analyze add-ai-frontend-fhd-evidence-workflow --json`
  - `spectra validate --strict --changes add-ai-frontend-fhd-evidence-workflow`
  - 內容 review 可直接用模板起草下一個 FHD 變更
  - spec、templates、guide 與 hook 配置使用同一套 workflow vocabulary
- Scope boundaries:
  - In scope：workflow spec、canonical docs templates、lightweight hook integration
  - Out of scope：逐頁重做、重型 screenshot 平台、CI 視覺 diff 服務、agent/human entrypoint 同步

## Risks / Trade-offs

- [工作流太重導致大家不想用] → 模板保持短小，聚焦 witness、例外、驗證三件事
- [與既有 Spectra proposal/design/tasks 重複] → 把 evidence workflow 定位成 FHD frontend change 的補充約束，而非取代 Spectra
- [hook 寫太硬影響一般開發] → 僅針對明顯 FHD / playback / shared chrome 路徑提供提醒或檢查，不擴大到全 repo
- [與入口同步 change 重疊] → 將 `AGENTS.md`、`CLAUDE.md`、README、repo-local skills 的對齊留給專門 change，這裡只維護 workflow 本體與 hook 接點
