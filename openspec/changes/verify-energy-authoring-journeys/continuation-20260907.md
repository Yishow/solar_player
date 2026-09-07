# E1 → E2 → E3 接續紀錄（2026-09-07）

## 範圍與狀態

接續從 `bb74dca94fcc86fe7e69d3f6703283d123b1456e` 開始的 review 修復。HEAD 維持 `8768480c5f2b866656e88f0cf31c0dcf9b264b2d`；前輪工作樹保留，本輪未 stage、commit、archive 或部署。以下是有界實作進度，不是三項 change 全部完成的聲明。

```text
MQTT packet + reviewed selector
  -> E1 admission / decimal normalization
  -> SQLite transaction: accepted + meter live + generic live
  -> commit 後 monitoring-history 通知（包含 late）
  -> E2 persisted samples + effective profile + calendar period
  -> E3 qualified projection / canonical API
```

## 本輪修復

- E1：reviewed energy 在任何 generic live 寫入之前進行 selector/admission；retained 缺可信時間、duplicate、collision、錯誤 selector 不刷新 live。較早的 source-time 或 received-time-estimated sample 只保存歷史，不倒退 live。來源時間、selected-record timestamp path、selector version、measurement kind 保存於 additive migration `046`。
- E1：倍率只套一次；SQLite accepted/meter-live/generic-live 同一交易，失敗可重新接納；事件在 commit 後發送。負的消耗錶絕對讀值 quarantine。明確 selector 不可借另一筆 tag record 的 timestamp、不可以 raw scalar 繞過 selector；SQLite 查詢錯誤不當成 legacy mapping。
- E2：輸出實際邊界、樣本 IDs、offsets、observedDeltaKwh、freshness 和版本證據；缺期初或只有一筆不是有效零。過舊的期初樣本不把期前能量混入 observed partial。已批准 received-time estimate 保留 sourceTimestamp=null 且不得 exact；interval-energy 只列已觀測加總，未證明 interval coverage 前不宣稱完整用電。
- E2/E3：historical period 使用當時生效 profile；中途換版與明確指定已失效 revision 回 partial／邊界證據。新的 profile boundary 納入 projection context，避免回傳舊 boundary 清單。
- E2：DailySummaryService 的 CL/KN consumption 改用 canonical day resolver/projection；既有 daily_energy_summaries 的 consumption_total 不再寫 clamp delta，維持 null；generation/self-consumption/CO2 的累積方式保留，global 舊路徑保留。正常 history API 使用 canonical period/series。直接依賴舊 consumption_total 欄位的讀者須改讀 canonical 結果。
- E3：migration `047` 保存 period/profile/meter/context、result JSON、expected active、previous active、input checksum。相同 shadow 輸入可重入；啟用以 DB 中的 candidate、相關輸入 checksum 和 transaction CAS 驗證；rollback 只走實際啟用 lineage，沒有前版時保留目前版，多個 context 時要求明確 expected ID。
- E3：checksum 只涵蓋所選 channels、截止時間以內的期間讀值及每個 identity 的前置 baseline。下一個月或無關 channel 的樣本不會錯誤阻擋本期間。API 不再用未限定月份/asOf 的 projection 覆蓋結果：9/1 為 300，9 月底才為 4300。

## Standards review

主代理回讀 source、migration、測試及 diff，整合 Luna 的唯讀證據。修正了交付測試仍停在 WRONG-TAG、未真正觸發 SQLite rollback 的盲點；現在先還原有效 selector，驗證 generic-live trigger 失敗完全 rollback，移除 trigger 後相同 packet 可成功。

本輪沒有 UI 視覺改動、沒有跨越來源 lifecycle/會計配置的產品決策；採用既有 service、decimal helper、canonical JSON 與 SQLite transaction。最後版本需以驗證段的實際 gate 為準。

## Spec review 與尚未實作項目

| Change | 已勾選 / 總數 | 尚未完成的主要契約 |
| --- | --- | --- |
| E1 add-meter-reading-contracts | 8 / 12 | source lifecycle append-only revision/epoch、純名稱更新與 actor/reason；完整 source CRUD/穩定錯誤/權限測試；M1/M2 capture→mapping 全旅程；隔離真實 broker 重啟演練 |
| E2 fix-period-consumption-deltas | 5 / 12 | immutable draft review calculator seam、完整 source definition revision 驗證；interval 起訖/coverage；reset/replacement segments、rollover modulus/合理跳值政策；source boundaryMaxAgeSeconds 持久化與既有 freshness policy 接合、獨立 dailyCoverage metadata；全部情境驗證 |
| E3 repair-consumption-history-projections | 8 / 14 | bounded dry-run/backup/diff/unreconstructable CLI；server-owned period catalog 與 editor/runtime resolver；global/week/total 契約與完整 history API 範圍；source revision change 的局部重算、month/year production projection materialization；備份資料修復/回退演練 |

本輪新增勾選：E1 1.2；E2 1.5、1.10；E3 1.2、1.9。包含多項條件的其他 task 即使已有部分程式仍維持未勾選。

Review 判定：DailySummary 在樣本/品質/freshness 未變時保留舊 immutable projection，並不把舊 calculatedThrough 當成新請求結果。新增測試證明 04:01→04:02 poll 不新增 accepted reading/等價 projection，但 canonical API 明確回 04:02 的 calculatedThrough；asOf 不匹配的快照不被採用。

## 驗證

最終七階段 gate：**PASS**（第三輪，最後 review 修復後）。

- build、bundle-budget：PASS。
- shared：141/141 PASS。
- server：895/895 PASS。
- web：1438/1438 PASS。
- deploy：110 PASS、1 SKIP（環境缺 real flock 的既有測試）。
- server-runner：14/14 PASS。
- 三項 Spectra validate：PASS。Artifact analyze：E1/E2 無 finding；E3 17 Warning、0 Critical（名稱/設計與任務對應檢查，對應工作仍在 task 中保留）。
- git diff --check：PASS。

已執行 RED→GREEN：boundary evidence、partial observed、receive-time estimate、duplicate member；錯月/asOf projection；profile effective revision；CAS／lineage／idempotence；DailySummary 停用 clamp；負 consumption quarantine；profile boundary cache invalidation。

第一輪 gate 的 FAIL 是 E6 測試 fixture 未載入 `046`，已補 migration 並單測通過；第二輪 gate 七階段 PASS，最後 review 補修後再執行第三輪。完整輸出位於 `.scratch/energy-contracts-continuation-20260907/`。

NOT RUN：真實 MQTT broker restart、production DB dry-run/repair/deployment、瀏覽器 J1–J4、FHD fresh witness、Pi 與人工 acceptance。測試使用隔離 SQLite 與 MQTT callback fake client，不稱為現場驗收。

## Checkpoint

本輪 checkpoint 位於 `.scratch/energy-contracts-continuation-20260907/checkpoint.json` 與 `checkpoint.patch`，包含 HEAD、完整工作樹 patch、scope 清單與 SHA-256；排除 `.scratch/` 自身避免遞迴，保留前輪 checkpoint。沒有建立 git commit。
