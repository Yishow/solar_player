# E6 preview snapshot 局部修復（2026-09-07）

本輪接續 E2 task 1.3 / E6 task 1.5。只完成不依賴 `definitionRevision` 語意的 preview 保護；兩項 checkbox 保持未完成。

## 修復

- draft、periodSelection 深拷貝，expectedRevision 在 calculator 前擷取；驗證、calculator、token 與回傳 profile 使用同一份 draft snapshot。
- calculator 輸入遞迴 freeze，外部 closure 修改原 request 不影響 snapshot。
- calculator 成功後才建立 preview token；失敗不留下可套用 token。
- 保留既有 apply transaction、版本衝突與 idempotency 行為。

```text
request -> clone / validate / freeze -> calculator
                                         | 成功 -> token -> apply 版本檢查
                                         | 失敗 -> 無 token
```

## 驗證

- Worker RED：新增三項反例，原實作 3 PASS / 3 FAIL。
- 主代理重跑 `rtk pnpm --filter @solar-display/server test src/services/siteEnergyProfileService.test.ts`：6/6 PASS。
- 主代理已回讀本輪兩檔增量 diff；Standards reader 未發現新增問題。
- 完整 `rtk pnpm verify`：七階段 PASS、exit 0；shared 147/147、server 915/915、web 1438/1438、deploy 110 PASS / 1 SKIP、server-runner 14/14。deploy 的既有 real-flock 環境測試跳過，不代表現場驗收。
- `rtk git diff --check` 與 E6 `spectra validate`：PASS。

## 尚未實作與需釐清項目

E2 design D9 要求 `definitionRevision`「存在且可用」，但沒有指定版本對象、型別、查詢 key 或可用性判準。E1 的物理來源使用 `sourceRevision` / `epochId`；既有 `DerivedMetricEvaluation.definitionRevision` 則是由 `metricKey` 定位的公式版本。E2 多錶輸入沒有 `metricKey`，不能據此認定兩者相同。

已向使用者詢問採各 channel 的 E1 source revision 集合，或 derived registry 公式版本。未收到選擇前不實作依賴該語意的介面。本輪不是完整 server-validated source review context：source revision 綁定／apply stale-source 檢查、持久化 period context、E2 數值 calculator 與 E2-R2-S05 正式整合驗證仍未完成。E2 interval coverage、daily coverage、reset／replacement／rollover 與 E3 歷史修復也仍待原任務依序處理。

未改正式 DB、未部署、未進行 browser/FHD/現場驗收，未 stage、commit 或 archive。保留前輪全部 WIP 與 checkpoint。本輪 checkpoint 位於 `.scratch/profile-preview-snapshot-20260907/`。
