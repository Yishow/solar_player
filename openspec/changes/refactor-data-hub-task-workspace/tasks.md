# Tasks｜把 DataHub 整理成任務入口與一致廠區工作區

狀態：實作中；U1-R1–R6 / U1-M1 已落地。U1-R7、U1-R8 等待 E6/U6 與 M1/M2 後再開。

前置：無

## 1. Implementation and Verification

- [x] 1.1 **Routing** — 增加task root及三個入口，保留四個專業route与舊usage/diagnostics query重導測試。（U1-R1; U1-M1）
- [x] 1.2 **Context** — 建立workspace scope parser與URL state，錯scope明確修正；scope不改binding/preview。（U1-R2; U1-M1）
- [x] 1.3 **Defaults** — 修KN預設KN、all要求選廠區，以及global不是實體電錶scope的驗證。（U1-R2; U1-M1）
- [x] 1.4 **Shared** — Broker/weather共用設定加明確影響標記，scope不適用時說明，不複製設定。（U1-R3; U1-M1）
- [x] 1.5 **Lists** — 將sources/metrics改摘要列表與搜尋/異常/ownership篩選，summary counts同scope。（U1-R4）
- [x] 1.6 **Drawer** — 建立單筆details drawer並分basic/advanced，managed來源顯示不可編輯原因。（U1-R4）
- [x] 1.7 **Safety** — 建立全量保存跨scope不遺失的回歸；未有row PATCH時保留完整collection再合併。（U1-R5）
- [x] 1.8 **Drafts** — 把live observations與editable draft分開，切scope/route/refresh的discard guard含失敗保留。（U1-R5）
- [x] 1.9 **Accessibility** — 完成鍵盤focus return、文字狀態與三種desktop尺寸無遮擋檢查。（U1-R6）
- [x] 1.10 **Verification** — 執行DataHub/router/scope tests與pnpm verify；以接資料/查錯兩条任務測量切頁次數作改版基準。（U1-R1 U1-R2 U1-R3 U1-R4 U1-R5 U1-R6; U1-M1）

## 2. V2 Site-Setup Integration

- [x] 2.1 **V2 Integration** — 接入E6/U6的唯一廠區計量設定與免手冊任務契約，完成本新增需求的API/UI整合與驗收情境。（U1-R7）

- [ ] 1.12 **V3 MQTT integration** — 串接受控已接收資料清單/穩定tag來源與原任務，依新增契約驗證，不再要求外部client/手填mapping；此change只實作本層整合。（U1-R8）

## Closeout Notes

每個 task 完成時記錄測試名稱、指令、exit code 與證據路徑。

- 1.1–1.10：`pnpm --filter @solar-display/web test 'src/pages/DataHub/**/*.test.ts' 'src/pages/DataHub/**/*.test.tsx' src/app/dataHub.test.ts src/app/router.test.ts src/app/dataHubCompatibility.test.ts` — exit 0（見 scratch `refactor-data-hub-task-workspace-tests.log`）。U1-R7 / U1-R8 尚未勾選。

Archive 與 commit 依 repo workflow 另行執行；不在本草案提前標記。
