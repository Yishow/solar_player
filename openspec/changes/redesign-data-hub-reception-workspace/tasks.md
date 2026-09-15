## 0. 跨發布端前置契約
- [ ] 0.1 對齊 MQTT-OWNERSHIP 與 PUBLISH-TAG-REGISTER，實作 DHR-R5、DHR-R6，以對應 PM/KN 驗收案例證明責任不跨界。
- [ ] 0.2 接收資料必須區分 Solar 託管、電力原始點、電力計算結果與診斷訊息；批准範圍須對應 Solar／OPC 實際 namespace，不沿用 factory/ 範圍假稱涵蓋所有資料。

## 1. 路由與資料模型
- [ ] 1.1 建立 configured/received view resolver 與舊 task/selection URL 相容測試（U1-R8、DHR-R1）。
- [ ] 1.2 定義候選、正式 mapping、managed source 與 unknown 計數的顯示模型。
- [ ] 1.3 檢查 capture API 的多 profile/filter、stop、expiry、pagination、coverage 真實支援；補齊必要欄位。

## 2. 接收工作台
- [ ] 2.1 實作雙視圖、主 CTA 與進階手動入口（U1-R8）。
- [ ] 2.2 實作具名 approved profile/filter picker，不再默選多個中的第一個（DHR-R2）。
- [ ] 2.3 實作 capture 開始、停止、剩餘時間、上限、partial/refused/silent/expired 狀態（DHR-R3）。
- [ ] 2.4 實作 topic→tag/field 候選呈現、mapping 關聯與有界樣本檢視（DHR-R4）。
- [ ] 2.5 實作 missing scope、權限不足、離線例子、樣本過期的原地 recovery。

## 3. 列表與連續操作
- [ ] 3.1 改 SourceSummaryRow 的 managed 摘要與 usage unknown 模型。
- [ ] 3.2 實作穩定 selection、URL push/replace policy、Back/Forward、scroll anchor（DHR-R1）。
- [ ] 3.3 處理 request abort/generation、scope cache separation 與 auth reset。
- [ ] 3.4 依現有 transport 實作有界更新與 backoff，不臆造 capture streaming。
- [ ] 3.5 串接 D 三階段流程與原始 return context。

## 4. 驗收
- [ ] 4.1 測 0/1/200 筆 configured source 與 1000 topics 的 synthetic bounded capture。
- [ ] 4.2 測多 tag、schema changed、retained、sample eviction、部分範圍拒絕與過期。
- [ ] 4.3 測快速切廠區及跨權限 sample access，不洩漏另一 scope 的內容。
- [ ] 4.4 測鍵盤選取、窄螢幕與列表穩定；取得 browser witness。
- [ ] 4.5 focused checks 與最終 pnpm verify；將真 Broker 測試與 synthetic 結果分列。
