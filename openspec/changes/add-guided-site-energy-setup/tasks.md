# Tasks｜四步廠區用電設定、分子分母選擇與日常任務捷徑

狀態：實作中。以下全部待實作／驗證；完成草案不代表實作完成。

前置：E6 / add-site-energy-accounting-profiles、E3 / repair-consumption-history-projections、E4 / fix-overview-monthly-consumption、E5 / fix-department-energy-shares、U1 / refactor-data-hub-task-workspace、U2 / add-guided-data-source-onboarding、U3 / refactor-display-editor-workspace、U4 / add-unsaved-binding-preview

## 1. Implementation and Verification

- [x] 1.1 **Entry** — 建立canonical energy route與DataHub/CircuitSettings/editor三處共用入口；scope與return context保留。（U6-R1）
- [x] 1.2 **Wizard** — 實作四screen state machine、back/dirty/conflict guard與site context skip。（U6-R2 U6-R9）
- [x] 1.3 **Picker** — 具中文名/廠區/語意/最近讀值的共用電錶選擇器，incompatible原因與advanced detail。（U6-R3）
- [x] 1.4 **Total** — 一枚或多枚總進線來源、無總錶分支、來源範圍review；不要求手填期初基準。（U6-R2 U6-R5）
- [x] 1.5 **Departments** — 部門多錶row editor、共用比較基準及inline overlap field errors。（U6-R4）
- [x] 1.6 **Review** — 接E6/E3/E5唯讀preview，顯示原始來源/分子/分母/時間/結果/影響，version-bound apply。（U6-R5）
- [x] 1.7 **Recovery** — 接U2 inline onboarding/legacy review，返回原欄位；取消與新source保存副作用清楚。（U6-R6）
- [x] 1.8 **Quick Edit** — 已設定summary與直接修改；跨廠區模板僅複製名稱不帶meter IDs。（U6-R7）
- [x] 1.9 **Editor Tasks** — 完成選取物件的更換資料/圖片/文字/顯示/發布任務捷徑，共用profile不雙寫。（U6-R8）
- [x] 1.10 **Accessibility** — 鍵盤焦點/非顏色狀態/非拖曳替代、錯誤恢復及desktop尺寸驗收。（U6-R3 U6-R9）
- [x] 1.11 **Tests** — 以真實profile/preview API走四步與日常改一項、scope、缺錶、衝突、return context。（U6-R1 U6-R2 U6-R3 U6-R4 U6-R5 U6-R6 U6-R7 U6-R8 U6-R9）
- [ ] 1.12 **Unassisted Acceptance** — 至少3名新操作員無手冊測指定任務，保存逐步結果；關鍵失敗修正重測，再pnpm verify及必要FHD。（U6-R10）

- [x] 1.13 **V3 MQTT integration** — 串接受控已接收資料清單/穩定tag來源與原任務，依新增契約驗證，不再要求外部client/手填mapping；此change只實作本層整合。（U6-R11）

## Closeout Notes

每項需實際測試與證據；原生驗證、pnpm verify、FHD與人工驗收pending。實作checkbox僅在本檔維護。

## V3 Dependency Authority

目前前置（取代上方舊版列表）：E6, E3, E4, E5, U1, U2, U3, U4, M2。依本段列出的 change dependency 為準；E1/E6不反向依賴UI以避免循環。
