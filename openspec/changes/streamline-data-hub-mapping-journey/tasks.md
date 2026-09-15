## 0. 跨發布端前置契約
- [ ] 0.1 對齊最新 MQTT-OWNERSHIP、PUBLISH-TAG-REGISTER 與 G 的 KNE/EPR 工程契約，實作 DHM-R4，以對應 PM/KN 驗收案例證明責任不跨界。
- [ ] 0.2 三階段先選sourceKind/mode，再走工程preview/period/版本，不要求meterId。不將已算好日量再差分；G共用gate及typed provider就緒前不可fallback。驗證 DHM-R4 及 G 對應情境；產品實作不因本次文件提交而勾選。

## 1. 流程骨架
- [ ] 1.1 將 connection/site prerequisites 與 M2 三階段分離，保留既有 task links（M2-R1）。
- [ ] 1.2 定義 upstream dependency invalidation、返回 picker 與同草稿展開／收合。
- [ ] 1.3 接 B 候選及 C preflight；有 reviewed evidence 時跳過重接收。

## 2. 選值與審查
- [ ] 2.1 整合 visual field/tag picker、sample provenance/revision 與完整工作區（DHM-R1）。
- [ ] 2.2 顯示語意／unit/scaling/timestampPolicy 的必要審查，復用 domain validator。
- [ ] 2.3 保留 numeric lexeme/partial input，修正 multiplier 的 silent fallback。
- [ ] 2.4 實作批次適用／不相容／未選取行的明確差異。
- [ ] 2.5 用 server canonicalDraft 渲染 preview；變更後明確失效，不自行拼 apply body。

## 3. 套用與診斷
- [ ] 3.1 接既有 previewToken＋canonicalDraft＋固定 idempotency key（DHM-R2）。
- [ ] 3.2 呈現保存、runtime 啟用、等待接收與 freshness，處理 timeout/409。
- [ ] 3.3 保留 initiating picker draft/field context，禁止越權自動改 E6/display binding。
- [ ] 3.4 移除完成階段必經發佈，改成可選進階診斷（DHM-R3）。
- [ ] 3.5 用所選目標取 publish confirmation，處理 expiry、target/value changed 與 unknown outcome。

## 4. 驗收
- [ ] 4.1 測四類既有 parser shape、literal dotted key、高精度 decimal、ambiguous tags。
- [ ] 4.2 測 retained/offline 與 preview 零 domain side effects。
- [ ] 4.3 測 token/revision/selection changes、idempotency lost-response retry 與 runtime refusal。
- [ ] 4.4 測 keyboard、三階段返回、批次排除與原 picker restoration。
- [ ] 4.5 focused checks、最終 pnpm verify；真 publish 測試只對隔離授權 Broker。
