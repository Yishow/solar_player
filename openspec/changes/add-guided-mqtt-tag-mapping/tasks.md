# Tasks｜三階段MQTT欄位選取、穩定tag與批次電錶配對

狀態：proposal-only。全部待實作／測試，草案完成不是產品完成。

前置：E1, E6, M1, U1。

## 1. Implementation and Verification

- [ ] 1.1 **Task UI** — 共用三階段panel、多選、已有來源短路、scope與origin保留。（M2-R1 M2-R2）
- [ ] 1.2 **Selector** — 定義typed message/record equality、tokenized paths與stable source fingerprint。（M2-R3 M2-R4）
- [ ] 1.3 **Engine** — 實作scalar/object/tag packet/tag array同production engine及lossless counter取值。（M2-R3 M2-R4）
- [ ] 1.4 **Picker** — 可點選欄位與tag rows、自動編譯selector、中文名稱/目標選擇器。（M2-R2 M2-R3）
- [ ] 1.5 **Meaning** — 累積/區間/功率與單位倍率確認、baseline狀態，阻擋CT/PT重複套用。（M2-R5）
- [ ] 1.6 **Batch** — 帶證據的建議、批次套用已確認格式、既有對應重用及不相容列修正。（M2-R6 M2-R7）
- [ ] 1.7 **Preview** — versioned唯讀preview共用engine，正反例與零publish/零live-history寫入。（M2-R8）
- [ ] 1.8 **Commit** — 原子設定transaction、idempotency、version conflict、pending runtime subscription reconcile。（M2-R9）
- [ ] 1.9 **Profile** — 嵌入U6與E6 draft/atomic final apply、返回原欄位，standalone不自動選分母。（M2-R10）
- [ ] 1.10 **Guards** — cross-site/reserved/physical duplicate檢查與逐列修正。（M2-R11）
- [ ] 1.11 **Drift** — schema/type/tag/身份異動診斷、source revision/epoch安全更換。（M2-R12）
- [ ] 1.12 **Legacy** — 既有PUT保留selector-aware資料或明確拒絕，舊mapping不被覆寫/重複計量。（M2-R13）
- [ ] 1.13 **Regression** — isolated broker＋SQLite/API＋UI實測全部scenario與runtime rollout/rollback。（M2-R1 M2-R2 M2-R3 M2-R4 M2-R5 M2-R6 M2-R7 M2-R8 M2-R9 M2-R10 M2-R11 M2-R12 M2-R13）
- [ ] 1.14 **Acceptance** — 至少3位未受教學操作員完成batch/change/recovery/return profile，保存結果再跑pnpm verify及必要FHD。（M2-R14）

## Closeout Notes

實跑受影響測試、原生提案驗證、pnpm verify及必要FHD/無手冊人工驗收；依repo流程完成再歸檔。
