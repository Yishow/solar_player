## Context

動機與 R9–R10 見 proposal.md 及 review report。`previewProfile` 已先驗證來源、凍結 draft/period，再呼叫可選 calculator；正式 route 未傳入 calculator。web 卻期待 calculator.period.valueKwh。`applyProfile` 會照抄 draft.status；UI 只在分母 select 的 onChange 設定 ready。

## Goals / Non-Goals

**Goals:** 讓正式 API 與 UI 的預覽型別一致，讓設定完成與資料足夠的判定不依賴使用者是否碰過某個控制項。

**Non-Goals:** 不新增第二套用電公式，不跳過來源審查，不把草稿 revision=0 偽裝成正式 revision，不重算或覆寫正式歷史，不改動已發布頁面內容。

## Decisions

### 1. 明確區分 persisted context 與 review context

正式 preview route 接上內部計算 seam，輸入為凍結的後端已驗證草稿、selected source snapshot、expected persisted revision、periodSelection 與單一 asOf。內部 context 明確標示 review；不要為了通過 resolver 的 revision 檢查，先 INSERT profile 或硬塞一個假的 revision。

沿用 `fix-energy-period-consumer-consistency` 的期間／占比核心，preview 只替換明確的已驗證設定情境，不替換樣本來源或資料品質規則。若 active profile 與 draft 日曆不同，結果標示 review boundary；production 的 context/cache key 不共用。Calculator 失敗在發行可用 token 前終止；有效的缺資料結果則帶 null 與診斷。

### 2. 前後端共用一個真實 preview DTO

回應包含 previewToken、expectedRevision、reviewContext、asOf、period/window、siteTimeZone、source identity/revision，以及 site total、department numerators、basis membership/value、shares、quality/coverage 與 readiness。沿用既有 envelope 相容原則，統一目前 service 的 calculator 型別與 UI 自行猜測的 calculator.period。

UI 顯示 server 數值，不本地重算占比或把 null calculator 一律翻成尚無差值。Token 綁定 reviewed draft/source snapshot；新增結果不能弱化 canonicalJson、expectedRevision 或 idempotency 防護。預覽後真正新收到資料可以在 apply 時更新 readiness，但不能默默改掉已審查的來源或設定；回應清楚區分 review asOf 與 activation asOf。

### 3. Readiness 是後端判斷，不是表單事件

後端共用驗證器依結構、來源相容性、歸屬／coverage 審查及所需期間證據回傳 readiness 和原因。保留既有狀態名稱：缺結構或審查不可宣稱 ready；合法已審查但期間不足是 configured-awaiting-data；必要證據完整才是 ready。每個狀態附所評估的期間，不能把某一個月足夠當成所有年日歷史完整。

Client 提交的 status 不是權威。移除分母 select 中推導 ready 的行為；預設 site-main 仍須在最後 review 明確確認，但不要求先選錯再選回。新增設定、編輯設定和發布前檢查共用相同狀態解釋；後續讀值使等待狀態改善時，由同一 readiness read path 重新評估，不要求再切選單或反覆 apply 來更新。

替代方案「只在下一步按鈕把 incomplete 改 ready」仍會偽造完成，因此排除。有效但等待資料可以保存；發布阻擋遵循既有需求，不為過關改成永遠允許。

## Implementation Contract

- 共用 `ProfilePreviewResponse` 保留 `previewToken`、`profile`、`siteTimeZone`；增加 `expectedRevision`、`reviewContext: "profile-draft"`、`asOf`、`periodSelection`、`sources`、`readiness`。`calculator` 必填，包含 `period: PeriodConsumptionResult`（總量）、`basis: { memberChannelIds, result: PeriodConsumptionResult }`、`departments: { departmentId, nameZh, result: PeriodConsumptionResult, ratio: number | null }[]`。所有數值使用既有 decimal 與 ratio 核心。
- `readiness` 為 `{ status, reasons: string[], periodSelection, asOf }`，status 沿用 profile 狀態。結構不完整或 coverage 未審查為 incomplete；來源不合格／結構無效阻止 activation；已審查且必要總量、部門、分母期間值為 exact 或 estimated-boundary 才 ready，其餘有效缺資料為 configured-awaiting-data。零分母不宣稱占比就緒。
- 新增明確的 shared review 計算入口，與 persisted 入口共用私有計算本體；persisted 的 revision guard 保留。後端 review 使用凍結草稿、來源 definition revisions、單次載入樣本／freshness policy、同一 asOf，不讀寫 production projection，不建立正式 profile。不以任意 client reviewContext 繞過 persisted guard。
- Preview token 保存 periodSelection/review asOf 以便 apply 同期間重評估；舊 token 缺 evidence 要求重新預覽。Apply 回應保留 profile 頂層形狀，附 `readiness`、`reviewAsOf`、`activationAsOf`；canonical draft/source guards 與 receipt replay 順序不變。
- GET profile 及 publishing preflight 共用後端 readiness read path，評估廠區日曆的當月，重新讀取資料；不改寫已存 profile/history。GET 回應附 readiness，profile.status 為當次衍生狀態；UI 完成文字使用該證據。
- 正式 readiness 仍尊重 persisted effective-period 的 `PROFILE_REVISION_BOUNDARY`：草稿 review 有值，不代表月中生效的設定已擁有整月正式數值。Apply 的 activation readiness 使用正式情境，receipt 固定該次結果；中途生效可成功保存但提示等待資料／設定期間邊界。siteTotal 明確 unconfigured 搭配合法 department-sum 仍可保存已審查的部門配置，不能宣稱 whole-site ready。
- UI 總錶與部門 coverage 要求明確確認，預設 site-main 不需切換。Review 顯示 server period、總量、分母、部門值／占比、quality 與缺基準原因；等待資料仍可保存，失敗保留選擇並禁止確認。

## Baseline difference record (2026-09-08)

- 本機 HEAD/main 為 `feb1ee33`，期間一致性修復已歸檔；`git ls-remote origin refs/heads/main` 實查遠端仍為 `eebfc62e`，本機包含另外兩個已完成的有界修復 commit。
- 工作樹起點只有本 change 未追蹤檔案。`selectEffectivePeriod` / `loadEffectivePeriodContext` 已統一 persisted 日期與設定邊界，shared `resolvePeriodConsumption` / `resolveDepartmentShares` 是唯一公式。
- 正式 preview route 仍未注入 calculator，service 仍返回 null；apply 仍照抄 draft.status；publication 仍只讀 stored ready。Review path 應單獨標示草稿情境，不能套 persisted effective-revision 選擇。

- Profile 讀取／反序列化集中於 `siteEnergyProfileRepository`，避免 authoring、period context 與 readiness 形成循環依賴；既有 service exports 保持相容。

## Risks / Trade-offs

- 新設定 revision=0 無法直接套 persisted resolver → 明確 review context，不建立假 profile。
- 讀值在 preview/apply 間新增 → source identity/revision 嚴格驗證；asOf/coverage 清楚分開，結果變化不可冒充原預覽。
- 自動 readiness 評估增加讀取成本 → 每次請求共用快照，必要快取綁定來源／profile 與樣本證據，不能沿用舊的 ready 字串。
- 舊測試只 mock calculator → 新增實際 route 計算與 profile=null 的正式 UI journey，保留原 conflict/idempotency suites。

## Migration Plan

優先修改 API/DTO 與讀取衍生狀態，不批次改寫既有 profile 或 accepted readings。若須附加 token evidence 欄位，在 apply 依最新 migrations 追加，舊 token 使用既有重新預覽規則。回退保留資料、停止新 preview 功能即可；不得把新草稿預覽存成正式歷史。與期間一致性提案共用核心，避免同一邏輯各修一份。

## Verification Strategy

用隔離 DB 建立完整端點與只一筆讀值兩種資料，直接呼叫正式 preview route，確認真實值／品質與零 production writes。UI 從 profile=null、保留預設 site-main 開始，完成來源與 coverage review、preview、apply；比較切換分母再切回的等價草稿。補偽造 ready、calculator failure、source stale、duplicate retry 與已指派能源頁的 preflight 測試。所有新案例先驗證 baseline 可失敗，再實作；最後跑 `pnpm verify` 與必要人工画面驗收。
