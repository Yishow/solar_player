# E1 → E2 boundary / freshness continuation — 2026-09-07

## 本輪交付

沿用既有 E1 add-meter-reading-contracts 與 E2 fix-period-consumption-deltas；接續 lifecycle checkpoint，保留所有既有 WIP。沒有 stage、commit、archive、merge 或正式資料操作。

- E1：新增 optional `boundaryMaxAgeSeconds`，新來源及 migration 既有列預設300秒；只接受正的 safe integer。這是規格的初始設計值，並非現場採樣頻率的確認。
- 049 additive migration 新增 `meter_sources.boundary_max_age_seconds`。Source CRUD、catalog list/detail、audit、MQTT lookup 均保留設定；省略欄位的舊 caller 更新名稱不會覆蓋原值。設定容許值不改實體 source revision、epoch、baseline；仍需 audit actor/reason。
- E2 loader 依完整 source identity join 取得來源容許值，影響期初、截止及 observed delta 的有界取樣；不使用開始後第一筆冒充 baseline。同 identity 同 instant 的可信 source observation 優先於 receive-time estimate，避免輸入排序影響 exact boundary。
- Freshness 與 boundary tolerance 分離。Resolver 使用既有 `freshness_policy.cumulative` thresholds 和請求 asOf，增加 `freshnessState`（live/delayed/stale/historical/unavailable），保留舊 `freshness`（fresh/stale/unavailable）相容欄位。允許收訊時間估計的資料仍可參與 estimated-boundary，但沒有可信 sourceTimestamp 時 freshnessState 為 unavailable。
- Closed period 的 quality/value 與 freshness 分離：去年有效的 exact endpoints 仍得到正確期間值；今天讀取可標 historical，不因資料年齡被改成 invalid。
- Projection input checksum 包含來源 boundary policy；同樣 samples/quality 下 observed delta 改變也會使 cache 失效，舊 shadow 不可 activation。Freshness policy 變動時讀 API 刷新兩個 freshness 欄位；DailySummary 比較新 state，仍不產生額外 accepted observations。
- Calculation version 升為 `e2-v3`，避免採用舊計算口徑的 active context。

```text
來源 CRUD -> boundaryMaxAgeSeconds -> E2 邊界／品質／delta
既有 freshness policy + sourceTimestamp + asOf -> freshnessState
兩者 -> canonical result -> projection input guard / API
```

## 測試與證據

RED→GREEN 包含：放寬 boundary 不得刷新 freshness、persisted policy 必須被讀取、估計收訊時間不能冒充可信 freshness、exact source 優先、同 quality projection 因來源容許值更新而失效。真 SQLite tests 同時檢查 accepted observations 不變。

Focused：shared periodConsumption 23/23、server periodConsumptionService 8/8、source CRUD 1/1、projection 8/8；worker source contract 15/15、catalog/MQTT 19/19。主代理另外回讀 worker source/schema/test/diff 並執行整合與完整 gate。曾因 projection fixture 少套049失敗，已補 migration；沒有用 catch schema error 或更改數值 expectation 掩蓋。

最後完整 `pnpm verify` 七階段 PASS：shared147、server912、web1438、deploy110 PASS/1 SKIP、runner14；build及bundle budget皆PASS。

完整 gate 與 hash manifest 以 `.scratch/period-boundary-freshness-20260907/checkpoint.json`、`verify.log` 為準。Spectra analyze 0 findings、validate PASS；這些是 artifact checks，不等同產品驗收。

## 任務狀態與後續

E2 仍為5/12，1.3及1.9是合成任務；本輪補齊其中 boundary/freshness 部分，不因局部通過就勾完。

1. E2：E6 immutable draft review calculator seam、definitionRevision 驗證、interval coverage、reset/replacement continuity、modulus/plausibility、dailyCoverage 仍待實作及完整 scenario 驗證。
2. E3：修復工具的副本 dry-run、backup/diff、不可重建清單，及 global/week/total、production materialization 仍待實作。
3. E1：隔離真 broker 重啟 retained replay 與完整 M1/M2 操作旅程仍未驗收；本輪沒有 browser、FHD、部署、現場驗收。

此 checkpoint 關閉上一輪報告中的 boundaryMaxAgeSeconds 來源欄位缺口；先前 checkpoint / 報告保留為歷史紀錄。


## 最終 Standards / Spec review 判定

- Standards reader 未發現本輪限定 hunks 的 hard violation；主代理回讀 source/schema/test/diff 並完成 full gate。
- Spec reader 提出「15:59:50 的 source observation 應勝過 15:59:55 的 receipt estimate」；主代理依 E2-R3 的 exact boundary observation 重新判斷：若查詢邊界為16:00，前者亦非 exact boundary，兩者皆為有界的 prior sample。規格允許 approved receipt estimate 並要求最後一筆 prior sample；故此例不足以成立缺陷。真正同 instant 的 exact source 優先已實作並驗證。
- Spec reader 另確認舊 `DailySummaryService.toDateKey` 用 host timezone 分日。主代理回讀 `persistConsumption` 與 `metrics-history`：canonical 用電期間由 profile timezone 解析，API 以 canonical series points 建立日期再 overlay legacy 發電/CO₂/peaks 等欄位。因此本輪用電序列日期正確，但 legacy summary 欄位跨時區對齊仍是既有缺口；需在後續 history calendar 收尾時明確處理，不能用本輪 freshness gate 宣告其已修復。
