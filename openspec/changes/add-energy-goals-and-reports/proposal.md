## Why

系統已累積 minute snapshots、daily summaries、current counters 與 sustainability conversion，但 operator 要回答「本週/本月表現如何、和上一期差多少、距離目標還多少」仍需手工抄數字到 Excel。現有歷史頁偏向查資料，不是可直接拿去會議或營運追蹤的報告；也沒有正式的發電、自用率、用電上限目標模型。

## What Changes

- 新增 daily/weekly/monthly energy report API與管理頁，統一提供發電、用電、自用、CO2、peak/coverage/provenance等可用指標。
- current incomplete period 明確標示 partial，並提供同進度 previous-period comparison，避免拿半個月直接比完整上月。
- 提供 CSV export，欄位與畫面使用同一 report model/time semantics。
- 新增 energy goals：至少支援 monthly generation target、self-consumption ratio target、consumption ceiling，可擴充其他 period/metric。
- Overview/management report 顯示 current progress、target gap、status與 previous-period/rolling comparison；無資料或 coverage不足時不偽造 0。
- 所有 period boundary 使用 server-authoritative local timezone，並建立 coverage/provenance欄位。

## Non-Goals

- 第一階段不產生 PDF/簡報檔；CSV 為正式 export。
- 不做財務帳務或電費結算引擎。
- 不用缺資料推估完整月份總量當作 actual。

## Capabilities

### New Capabilities

- `energy-reporting`: 日/週/月能源報告、partial period comparison、coverage/provenance 與 CSV export。
- `energy-goals`: 發電、自用率、用電上限等營運目標及進度/差距狀態。

### Modified Capabilities

（無）

## Impact

- Affected specs: new `energy-reporting`, `energy-goals`
- Affected code: report aggregation/query service/routes、CSV serializer、management report UI、Overview goal summary、shared types/tests。
- Affected data: 新增 goals persistence；reports主要讀既有 history，不複製 raw metrics。
- Dependency: 應在 `repair-monitoring-history-boundaries-and-retention` 完成後將修正後 daily summaries視為正式報告來源。
