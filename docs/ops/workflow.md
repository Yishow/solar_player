# Repo 發展工作流

> 依契約與風險選流程；已授權的工作連續做到可交付，階段更新不代表停下等待確認。

## 任務分流

| 任務 | 流程 |
|---|---|
| 只要求問答、研究、review、診斷 | 唯讀分析並回報，不建立 change；不因發現問題自行開始修正 |
| 只要求提案 | Spectra 提案建立 named change artifacts；一般建議直接回報，不開始實作 |
| 純文件／制度維護 | 直接修改 → review → 相關文件檢查 |
| 局部程式修正（恢復或維持既有契約） | 說明契約依據與範圍 → 實作 → review／修正 → 驗證 |
| 新功能、契約變更、資料遷移、跨模組設計 | named Spectra change → 實作 → review／修正 → 驗證 → 必要人工驗收 → archive |

- 局部修正須有既有規格、測試或已確認需求作依據；不能只以行數少判定。涉及安全邊界、資料完整性或部署行為的高風險修正仍走 Spectra。
- 已有完全對應的 change，直接續作該 change，不另開或改走局部修正以略過未完成 tasks；不把無關需求併入。
- 無法唯一判定目標或預期行為時，先釐清；只有依賴答案的工作暫停。詢問邊界見 `docs/ops/judgment.md`。

## 連續執行與驗證

1. 讀相關規格、程式、測試與 git 狀態，說明必要假設，保護既有 WIP。
2. 在授權範圍實作；bug fix 補能重現缺陷的回歸驗證，開發期間跑受影響測試。
3. 主代理 review 最後 diff，核對 repo 慣例與需求／規格；修完範圍內 findings，再依 `docs/ops/conventions.md` 驗證最終版本。程式交付 gate 是 `pnpm verify`；純文件修改使用相關文件檢查。
4. 涉及 Playback／FHD 時依 `docs/ops/fhd-closeout.md` 產生 fresh witness、gap notes 與 evidence bundle；人工 acceptance 由使用者決定。
5. Spectra tasks、驗證與必要人工 acceptance 全部完成後，接續歸檔該 change；不把待驗收 tasks 勾成完成。

- 使用者要求實作或修正時，上述步驟自動接續，不逐階段等待「繼續」。只要求分析、提案或 review 時，完成該產物即回報，不推定已授權實作。
- 過程簡述重要發現與下一步；結束回報變更範圍、驗證結果、限制與下一步。需要使用者決策或外部條件時，說明具體缺口。
- 「繼續」承接已說明的下一步與既有授權；不擴大範圍，也不代替人工驗收。

## Spectra 與大型需求

- Codex 使用 `$spectra-*`，Claude Code 使用 `/spectra-*`；以下省略前綴。
- 需求未清楚可用 `spectra-discuss`；建立 change 用 `spectra-propose`，實作與單純續作用 `spectra-apply`，需求中途改變才用 `spectra-ingest` 更新 artifacts 後續作。
- 查規格用 `spectra-ask`；達到歸檔條件用 `spectra-archive`；已獲提交授權時可用 `spectra-commit` 精準選取 change 檔案。
- 找不到預期 change 時查 `spectra list --parked`；`spectra-apply`／`spectra-ingest` 可處理還原，也可用 `spectra unpark <name>`。
- `.scratch` 只供大型、模糊或跨多個 changes 的產品意圖與拆票；一般修正不建立。`/grill-me`、`/to-spec`、`/to-tickets` 是可選工具，缺少時可用等效方式。
- Spectra 實作進度只記於 `openspec/changes/<change>/tasks.md`；`.scratch` 不複製 checkbox，也不授權 coding。

## 完成狀態與提交

| 狀態 | 證據與後續 |
|---|---|
| 實作與驗證完成 | 授權範圍已實作、review findings 已處理、必要自動檢查通過；直接修正可在此交付 |
| 待人工驗收／外部驗證 | 明列已完成的工程驗證與缺少的 witness／決策；不得宣稱已驗收或 launch-ready |
| 已歸檔 | Spectra tasks、驗證、必要人工 acceptance 均完成，且已 archive；不代表已 commit |

- 有檔案變更時留下 checkpoint：變更範圍、驗證結果與未完成事項；需要回復依據時保留 diff 或備份。問答與唯讀分析不需 checkpoint。
- 只有使用者明確要求才 stage／commit，且只包含本次確認範圍，禁止 `git add .`。既有明確授權可沿用；範圍改變須重新確認。Spectra change 先 archive 再 commit；直接修正不需補建 change。
