## Context

動機見 proposal.md，R5–R8 的原始碼證據見 review report。`periodConsumptionService` 已有有效日期／profile 邊界保護；`departmentSharesService` 卻直接使用 active profile 與 shared 純函式。歷史 route 以本月 points 取代所有 range；shared dailyCoverage 與正式日差值分別實作，因而漏掉 identity 與 asOf 條件。

## Goals / Non-Goals

**Goals:** 同一期間的所有消費端共用相同設定快照、來源範圍、時間邊界與品質，保留原有歷史查詢契約。

**Non-Goals:** 不設計新的跨版本分攤方式，不用最新設定回算全部過去資料，不修改原始樣本，不把 dailyCoverage 當成月端點差值是否成立的唯一條件。

## Decisions

### 1. 建立共用的後端期間情境，而非第二套占比公式

從現有 `resolveWithEvidence` 抽出可重用的 effective profile／period context，包含 profile revision、siteTimeZone、window、asOf、有效日期邊界、freshness policy 與已載入樣本。site total 與 department shares 使用這份情境；不要只是把 `getActiveProfile` 換成另一個查詢後仍跳過邊界檢查。

分子與分母先得到各自的 decimal delta 與品質，再交 shared ratio 計算。跨 profile 的期間沿用目前保守 partial/null 與 `PROFILE_REVISION_BOUNDARY`，不自行加權。已結束月份使用當時設定；已排程、尚未生效的設定不提前套用。UI 格式化保留 null、estimated 與 freshness，不宣稱全為 exact。

### 2. 比較基準的成員也屬於必要讀取集合

必要 channel 集合是 site-total、各部門、明確 share basis 的聯集，來源由所選 profile 取得；去重只影響讀取，不改變實際歸屬。使用 `profileMemberChannelIds`／`resolveShareBasisIds` 等既有契約，避免再列一份漏掉 custom basis 的迴圈。

替代方案「缺自訂分母就改用 site total」會改變產品意義，因此禁止。測試以 A=1000、B=100、C=400 明確區別錯誤的 10% 與正確的 25%。

### 3. 範圍先決定日期，再補 consumption

`metrics-history` 先依既有 range 契約得到日期集合或時間範圍，再在範圍內解析每日期間電量；只合併 consumption 欄位，保留該日期原有 generation/co2/peak/self-consumption。月曲線仍可有明確月份日期集合，但不得覆寫 day/week/year/total。

釐清現有 `MetricResolver` 的 range/date 行為後，以 route tests 固定相容性；不新增 week/total 的假 E2 period kind。資料載入按範圍共用快照，避免每筆日期重新掃全庫。沒有 profile 的路徑保留既有行為。

### 4. 日覆蓋率與日計算共用可計算條件

把排序、時間截止、source/epoch/revision 連續性及 boundary admissibility 共用成日層級邏輯。Monthly coverage 呼叫日評估時不再觸發月 coverage 遞迴。只計 completed windows 且能返回有效日電量的日期；未解釋下降、換錶未證明連續、未來讀值與功率不得提升 coveredDays。

總月差值仍依月端點判斷。完整月端點加上中間缺日，允許月值 exact 且 dailyCoverage incomplete。相同集合任意排序結果須一致；整月掃描只用單次載入、按 channel 排序的樣本索引。

## Risks / Trade-offs

- 更多值改為 partial/null → 這是修正假精確；附原因與 revision metadata，而不是補零。
- 跨服務重用引入循環 import → shared 保持純計算，後端負責 DB/profile orchestration，preview seam 接收明確快照。
- 長年範圍效能 → 共用樣本與日期索引；加入跨月／全年 fixture，避免逐日查全庫。
- 舊投影快取含錯誤 coverage → 更新 calculation version／context 驗證並拒用不匹配快取，不改寫原始樣本。

## Migration Plan

優先修正 read path 與新增回歸，不需預設 schema migration。若持久化回應格式改動，保留舊資料並以版本區隔。正式歷史重建另行 dry-run、產出差异與取得授權；本次不執行任何重算套用。回退可恢復讀取實作，不能刪除 accepted history 或設定歷史。

## Verification Strategy

R5：同月設定切換、歷史月份、future effective profile；R6：獨立 denominator channel、缺基準、去重；R7：五種 range、跨月、CL/KN 權限與其他能源欄位；R8：換錶日、未來樣本、亂序、reset、完整月但缺日。先使測試在 review baseline 失敗，再修復並跑 shared/server/web 受影響測試及 `pnpm verify`。UI 若因品質呈現影響 playback，另依現行 FHD 流程驗收，不能只憑數值測試完成視覺交付。
