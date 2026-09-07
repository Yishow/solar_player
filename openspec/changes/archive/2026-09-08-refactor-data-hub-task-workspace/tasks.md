# Tasks｜把 DataHub 整理成任務入口與一致廠區工作區

狀態：已完成；U1-R1～R8 與 U1-M1 已全數落地並通過全量驗證。

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
- [x] 1.12 **V3 MQTT integration** — 串接受控已接收資料清單/穩定tag來源與原任務，依新增契約驗證，不再要求外部client/手填mapping；此change只實作本層整合。（U1-R8）

## Closeout Notes

每個 task 完成時記錄測試名稱、指令、exit code 與證據路徑：
- Web 測試：`pnpm --filter @solar-display/web test 'src/pages/DataHub/**/*.test.ts' 'src/pages/DataHub/**/*.test.tsx' src/app/dataHub.test.ts src/app/router.test.ts src/app/dataHubCompatibility.test.ts` — exit 0（135 pass）。
- 涵蓋重點：
  - 任務入口與三項操作任務（`U1-R1-S01`、`TaskHome.test.tsx`）
  - 廠區工作區與 scope 校正（`U1-R2`、`workspaceContext.test.ts`）
  - 共用基礎設施標籤（`U1-R3`、`SharedInfrastructureBanner.test.tsx`）
  - 來源與指標摘要、篩選與 drawer（`U1-R4`、`Sources.test.tsx`、`Metrics.test.tsx`）
  - 安全儲存與草稿保護（`U1-R5`、`draftGuard.tsx`）
  - 無障礙鍵盤操作（`U1-R6`）
  - E6/U6 廠區用電設定精靈整合（`U1-R7`、`SiteEnergySetupPanel.test.tsx`）
  - M1/M2 已接收資料清單與導引式 mapping 整合（`U1-R8`、`GuidedOnboardingPanel.test.tsx`）
- 交付 gate：`pnpm verify` 實機執行全量通過。
