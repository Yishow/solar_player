## Problem

P2 修正：帳務 bounded calculation selector 仍可能讀入整段無關歷史。已重現同 channel 存在 1 月退役 identity、8 月底現行 identity 開頭基準與 9 月讀值時，加入 10,000 筆 2 月現行 identity 歷史，materializedRowCount 由 4 增至 10,004；完整 resolver 結果與新增前完全相同，valueKwh 仍為 75。

## Root Cause

selectCalculationEvidence 為每個歷史 identity 找 fromMs 以前的 anchor，再用所有 anchors 的最小值查整個 channel。不能成為任何 requested closing observation 的退役 identity，仍把 lower bound 拉回 1 月，讀入其後大量不參與計算或 continuity diagnostics 的資料。

## Proposed Solution

- 先界定 requested span 中可能成為 closing observation 的 identities，以及 span 前最後 eligible closing fallback；只讓這些 calculation-relevant identities 的開頭基準決定向前擴張。
- 保留相關開頭／結尾、equal-instant ties、兩者間跨 meter/revision/epoch 的 continuity evidence；不以目前設定的 identity、固定回看天數或 SQL LIMIT 截斷有效證據。
- 維持 calculation 與 projection fingerprint 的不同選取規則，不修改 shared resolver 或既有 transaction-time fingerprint invalidation。
- 增加含退役與現行 identities 交錯歷史的固定 fixture，以 full-load resolver 作 oracle，同時檢查 materialized row identities/counts 與 query plan。

## Success Criteria

- 1 月 retired + 8 月底 baseline + 9 月窗口的固定 fixture 在加入 10,000 及 100,000 筆無關 2 月歷史後，選取 row identities/counts 均不增加，完整結果與原 oracle deeply equal。
- day/month/year/week/total、多日期、replacement meter、source revision、epoch、reset、interval-energy、同時刻 ties、late arrival 與 receive-time-estimated 既有結果不變。
- 有效但過舊的 baseline 與必要 intervening observations 保留；無窗口內讀值仍維持 full-load 的 unavailable/freshness 診斷。
- 受影響 server tests、capacity differential gates、兩軸 review 與 pnpm verify 通過；本機量測不代表 production capacity acceptance。

## Capabilities

### New Capabilities

- （無）

### Modified Capabilities

- consumption-history-projections：補充退役 identity 不得擴大不變 calculation evidence closure 的可驗證邊界。

## Impact

- Affected specs：consumption-history-projections。
- Affected code：
  - Modified：apps/server/src/services/accountingEvidenceSelection.ts
  - Modified：apps/server/src/services/accountingEvidenceSelection.test.ts
  - Modified：apps/server/src/services/meterReadingService.ts
  - Modified：apps/server/src/services/meterReadingService.test.ts
  - Modified：apps/server/src/services/periodConsumptionService.test.ts
  - New：（無）
  - Removed：（無）
- 優先沿用現有 indexed read helpers；僅必要時補同層 lookup，不新增 schema/index，不修改任何 persisted reading、profile 或 projection。
