# Tasks｜修復首頁月用量曲線與顯示狀態

狀態：proposal-only；以下全部為待實作與待驗證項目，不因提案已寫好而打勾。

前置：E3 / repair-consumption-history-projections

## 1. Implementation and Verification

- [ ] 1.1 **Reproduction** — 新增管理預覽缺 context、日資料順序、missing baseline 的可重現 fixtures與 HTTP狀態觀察。（E4-R1 E4-R3; E4-M2）
- [ ] 1.2 **Model** — 建立 date/revision 排序與 finite validation model，0有效，reject NaN/Infinity及跨月資料。（E4-R2; E4-M2）
- [ ] 1.3 **Chart** — 改連續 segment 繪製，缺日不補線，單點 marker與全0可讀刻度。（E4-R2; E4-M2）
- [ ] 1.4 **Context** — 實體播放保留 device path；管理預覽接明確scope的 management API，不拿假装置身分解401。（E4-R1; E4-M2）
- [ ] 1.5 **State** — 加入 loading/no-baseline/empty/error/unauthorized/stale/partial 的可測狀態與重試動作。（E4-R3; E4-M2）
- [ ] 1.6 **Refresh** — cache key 納入 scope/month，取消或丟棄 stale request，matching monitoring-history事件可更新當日點。（E4-R3; E4-M2）
- [ ] 1.7 **Compatibility** — 保留 phasePower stable id及geometry/visibility，增加 editor→publish→runtime配置回歸。（E4-R4; E4-M2）
- [ ] 1.8 **Scope** — 於缺陷紀錄保留「月報價→月用量曲線」假設，確認未引入電價／貨幣顯示。（E4-R5; E4-M1）
- [ ] 1.9 **Verification** — 跑 PhasePowerTableWidget、monthlyConsumptionModel、Overview config tests與 pnpm verify。（E4-R1 E4-R2 E4-R3 E4-R4 E4-R5; E4-M1, E4-M2）
- [ ] 1.10 **Acceptance** — 建立1920x1080新鮮witness與gap notes，涵蓋真實0、gap、pending baseline及發布刷新；請使用者判定視覺接受。（E4-R2 E4-R3 E4-R4; E4-M2）

## 2. V2 Site-Setup Integration

- [ ] 2.1 **V2 Integration** — 接入E6/U6的唯一廠區計量設定與免手冊任務契約，完成本新增需求的API/UI整合與驗收情境。（E4-R6）

## Closeout Notes

每個 task 完成時記錄測試名稱、指令、exit code 與證據路徑；不能只寫「測過了」。當前未執行原生 Spectra analyze/validate/park、應用測試或部署。

Archive 與 commit 依 repo workflow 另行執行；不在本草案提前標記。
