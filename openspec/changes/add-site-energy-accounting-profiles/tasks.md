# Tasks｜建立每廠區總用電、部門來源與占比基準設定

狀態：proposal-only。以下全部待實作／驗證；完成草案不代表實作完成。

前置：E1 / add-meter-reading-contracts

## 1. Implementation and Verification

- [ ] 1.1 **Tests** — 先建CL/KN隔離與siteTotal/denominator分離的red tests。（E6-R1 E6-R2 E6-R4）
- [ ] 1.2 **Model** — 實作versioned profile、source references、department identities與site境界共享schema。（E6-R1 E6-R2 E6-R3 E6-R4）
- [ ] 1.3 **Validation** — 驗證單位/類型/廠區、已知重疊、未知topology確認；允許合法父分母/子分子。（E6-R5）
- [ ] 1.4 **Persistence** — 新增profile、revision、audit與effective interval儲存；additive migration無自動猜测生產設定。（E6-R1 E6-R7）
- [ ] 1.5 **API** — 實作GET、唯讀preview interface、version-bound apply與idempotency；後續數值resolver注入E2/E3/E5。（E6-R6）
- [ ] 1.6 **State** — 分開結構未完成、已設定待資料、可用及衝突；空值提供欄位定位與動作。（E6-R9）
- [ ] 1.7 **Consumer Contract** — 建立profile-following與legacy/custom消費端識別、影響報告與revision cache契約。（E6-R8）
- [ ] 1.8 **History** — 實作往後生效、封存期間歸屬、跨版本標示及非破壞rollback契約。（E6-R7）
- [ ] 1.9 **Compatibility** — 清冊只形成待確認候選；不改broker/topic ownership，不複製page-owned分母。（E6-R3 E6-R8）
- [ ] 1.10 **Verification** — 跑全部profile API/shared/db測試及pnpm verify；記錄實際證據。（E6-R1 E6-R2 E6-R3 E6-R4 E6-R5 E6-R6 E6-R7 E6-R8 E6-R9）

- [ ] 1.11 **V3 MQTT integration** — 串接受控已接收資料清單/穩定tag來源與原任務，依新增契約驗證，不再要求外部client/手填mapping；此change只實作本層整合。（E6-R10）

## Closeout Notes

每項需實際測試與證據；原生驗證、pnpm verify、FHD與人工驗收pending。實作checkbox僅在本檔維護。
