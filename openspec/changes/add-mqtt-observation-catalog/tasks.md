# Tasks｜MQTT已接收資料清單與受控來源探索

狀態：proposal-only。全部待實作／測試，草案完成不是產品完成。

前置：無。

## 1. Implementation and Verification

- [ ] 1.1 **Contracts** — 建立observation/reception/capture/candidate shared types及metadata schema。（M1-R1 M1-R5 M1-R10）
- [ ] 1.2 **Scope** — 命名範圍設定、授權查詢與未知namespace的inline分支。（M1-R2）
- [ ] 1.3 **Tap** — runtime parse前的非阻塞catalog tap與有限候選queue，不改accepted history。（M1-R1 M1-R7）
- [ ] 1.4 **Session** — unique-ID只讀capture client、非shared訂閱、timeout/reconnect/stop清理。（M1-R3）
- [ ] 1.5 **Status** — 逐filter訂閱回覆與coverage/無流量/部分失敗狀態。（M1-R4）
- [ ] 1.6 **Metadata** — 保存retained/QoS/dup/source time與receive time，正確標示未知publisher。（M1-R5 M1-R6）
- [ ] 1.7 **Catalog** — 候選tag/欄位搜尋、sampleRefs與version/pagination，選取不隨stream跳動。（M1-R7 M1-R10）
- [ ] 1.8 **Bounds** — 實作payload/session/global budgets、rate/drop counters、auth/redaction。（M1-R8）
- [ ] 1.9 **Offline** — 原地paste/import的有限JSON/scalar evidence與TTL過期提示。（M1-R9）
- [ ] 1.10 **API** — capture CRUD、樣本與列表/stream API的錯誤語意與server-side scope驗證。（M1-R4 M1-R8 M1-R10）
- [ ] 1.11 **Rollout** — feature flag、managed來源合併展示、退出/rollback保持production。（M1-R11）
- [ ] 1.12 **Tests** — 隔離MQTT broker/SQLite/API實测正常、拒絕、無資料、retained、負載、越權及清理，再跑repo驗證。（M1-R1 M1-R2 M1-R3 M1-R4 M1-R5 M1-R6 M1-R7 M1-R8 M1-R9 M1-R10 M1-R11）

## Closeout Notes

實跑受影響測試、原生提案驗證、pnpm verify及必要FHD/無手冊人工驗收；依repo流程完成再歸檔。
