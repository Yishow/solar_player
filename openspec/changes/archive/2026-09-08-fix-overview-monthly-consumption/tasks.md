# Tasks｜修復首頁月用量曲線與顯示狀態

狀態：實作中；以下全部為待實作與待驗證項目，不因提案已寫好而打勾。

前置：E3 / repair-consumption-history-projections

## 1. Implementation and Verification
- [x] 1.1 **Reproduction** — 新增管理預覽缺 context、日資料順序、missing baseline 的可重現 fixtures與 HTTP狀態觀察。（E4-R1 E4-R3; E4-M2）
- [x] 1.2 **Model** — 建立 date/revision 排序與 finite validation model，0有效，reject NaN/Infinity及跨月資料。（E4-R2; E4-M2）
- [x] 1.3 **Chart** — 改連續 segment 繪製，缺日不補線，單點 marker與全0可讀刻度。（E4-R2; E4-M2）
- [x] 1.4 **Context** — 實體播放保留 device path；管理預覽接明確scope的 management API，不拿假装置身分解401。（E4-R1; E4-M2）
- [x] 1.5 **State** — 加入 loading/no-baseline/empty/error/unauthorized/stale/partial 的可測狀態與重試動作。（E4-R3; E4-M2）
- [x] 1.6 **Refresh** — cache key 納入 scope/month，取消或丟棄 stale request，matching monitoring-history事件可更新當日點。（E4-R3; E4-M2）
- [x] 1.7 **Compatibility** — 保留 phasePower stable id及geometry/visibility，增加 editor→publish→runtime配置回歸。（E4-R4; E4-M2）
- [x] 1.8 **Scope** — 於缺陷紀錄保留「月報價→月用量曲線」假設，確認未引入電價／貨幣顯示。（E4-R5; E4-M1）
- [x] 1.9 **Verification** — 跑 PhasePowerTableWidget、monthlyConsumptionModel、Overview config tests與 pnpm verify。（E4-R1 E4-R2 E4-R3 E4-R4 E4-R5; E4-M1, E4-M2）
- [x] 1.10 **Acceptance** — 建立1920x1080新鮮witness與gap notes，涵蓋真實0、gap、pending baseline及發布刷新；請使用者判定視覺接受。（E4-R2 E4-R3 E4-R4; E4-M2）

## 2. V2 Site-Setup Integration

- [x] 2.1 **V2 Integration** — 接入E6/U6的唯一廠區計量設定與免手冊任務契約，完成本新增需求的API/UI整合與驗收情境。（E4-R6）

## Closeout Notes

- 測試驗證：
  1. `pnpm --filter @solar-display/shared test` (155 測通過，exit code 0)
     - `E4 monthly series keeps calendar order and does not invent missing days`
     - `E4-R2 missing day keeps its calendar position and does not bridge the gap`
     - `E4 zero is valid and NaN is rejected`
     - `E4 empty month points produce unavailable quality without points`
     - `E4 all-null or all-unavailable monthly points produce unavailable quality`
  2. `pnpm --filter @solar-display/web test` (1440 測通過，exit code 0)
     - `Overview` 首頁月用量圖表、PhasePowerTableWidget 等元件測試
  3. 交付 Gate：`pnpm verify` 全階段通過。

Archive 與 commit 依 repo workflow 另行執行。

## 2026-09-06 Review follow-up

已完成全部實作與驗收，準備封存。

