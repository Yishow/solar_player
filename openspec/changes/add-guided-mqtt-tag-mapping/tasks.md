# Tasks｜三階段MQTT欄位選取、穩定tag與批次電錶配對

狀態：proposal-only。全部待實作／測試，草案完成不是產品完成。

前置：E1, E6, M1, U1。

## 1. Implementation and Verification

- [ ] 1.1 **Task UI** — 共用三階段panel、多選、已有來源短路、scope與origin保留，交付 **Configured-source onboarding is a three-stage task** 與 **Source and value selection is visual and reversible**。（M2-R1 M2-R2）
- [ ] 1.2 **Selector** — 定義typed message/record equality、tokenized paths與stable source fingerprint，交付 **Multiplexed tags use explicit identity selectors**。（M2-R3 M2-R4）
- [ ] 1.3 **Engine** — 實作scalar/object/tag packet/tag array同production engine及lossless counter取值，交付 **Supported extraction shapes share one bounded production engine**。（M2-R3 M2-R4）
- [ ] 1.4 **Picker** — 可點選欄位與tag rows、自動編譯selector、中文名稱/目標選擇器。（M2-R2 M2-R3）
- [ ] 1.5 **Meaning** — 依Selector Contract確認累積/區間/功率、energyFlowRole、單位倍率、timestampPolicy（預設source-required，allow需sourceRevision/audit）與baseline狀態；sourceTimestampTimeZone只在offset-free timestamp需要，阻擋CT/PT重複套用；交付 **Measurement meaning is confirmed rather than guessed**，以M2-R5-S01/M2-R5-S02及offset/null狀態測試驗證。（M2-R5）
- [ ] 1.6 **Batch** — 帶證據的建議、批次套用已確認格式、既有對應重用及不相容列修正，交付 **Suggestions have visible evidence and require target confirmation** 與 **Batch setup reuses reviewed structure without cloning identities**。（M2-R6 M2-R7）
- [ ] 1.7 **Preview** — 依Proposed API and Apply Semantics以同一production engine產生versioned唯讀preview，回server canonicalDraft與opaque previewToken供UI review並原樣帶回，保留review evidence control record但零domain metrics/live/baseline/profile/page寫入；交付 **Draft preview never publishes or changes readings**，以M2-R8與M2-R9-S04至M2-R9-S08驗證。（M2-R8）
- [ ] 1.8 **Commit** — 依Implementation Contract要求apply帶previewToken、UI確認的canonicalDraft與idempotency key，server canonical hash綁token/draft，same-key exact retry回原結果、changed payload 409，首次transaction commit前重查token/revisions避免TOCTOU，衝突/過期均zero-write；交付 **Apply is versioned idempotent and honest about runtime activation**，以M2-R9-S01至M2-R9-S09及SQLite snapshot驗證。（M2-R9）
- [ ] 1.9 **Profile** — 依Proposed API and Apply Semantics嵌入U6與E6 draft/atomic final apply、返回原欄位；standalone綁相關profile baseline或明確unconfigured，不自動選分母、不在E1複製accounting ownership；交付 **Meters and accounting profiles have one authoritative binding path**，以M2-R10-S01/M2-R10-S02驗證。（M2-R10）
- [ ] 1.10 **Guards** — cross-site/reserved/physical duplicate檢查與逐列修正，交付 **Ownership scope and physical-identity conflicts are blocking errors**。（M2-R11）
- [ ] 1.11 **Drift** — schema/type/tag/身份異動診斷、source revision/epoch安全更換，交付 **Schema drift and source replacement preserve accounting continuity**。（M2-R12）
- [ ] 1.12 **Legacy** — 既有PUT保留selector-aware資料或明確拒絕，舊mapping不被覆寫/重複計量，交付 **Legacy mapping edits cannot erase new selectors**。（M2-R13）
- [ ] 1.13 **Regression** — 以isolated broker＋SQLite/API＋UI實測全部scenario，包含canonicalDraft/token race、selector/target/semantics/selected set/profile mutation改動、revision conflict、token expiry、same-key conflict、lost-response exact retry與runtime rollout/rollback；驗證Legacy Safety and Migration不丟selector且domain zero-write邊界成立。（M2-R1 M2-R2 M2-R3 M2-R4 M2-R5 M2-R6 M2-R7 M2-R8 M2-R9 M2-R10 M2-R11 M2-R12 M2-R13）
- [ ] 1.14 **Acceptance** — 至少3位未受教學操作員完成batch/change/recovery/return profile，交付 **Task completion is validated without manuals or external clients**；保存結果再跑pnpm verify及必要FHD。（M2-R14）

## Closeout Notes

實跑受影響測試、原生提案驗證、pnpm verify及必要FHD/無手冊人工驗收；依repo流程完成再歸檔。
