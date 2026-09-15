## 1. Physical profile 不越界
- [ ] 1.1 對齊PMQ與G的KNE/EPR分工：physical要求不套KN工程來源；以sourceKind測不同gate和拒絕fallback（PMQ-R1/R6）。
- [ ] 1.2 盤點CL 20 raw/10 virtual與實際部署差異，只對選用DDE的部署驗證VIEW同Session及禁止service（PMQ-R1、KNP-R1）。
- [ ] 1.3 [after: 1.2] 新增site/publisher/Client ID與版本化physical topic；測同broker兩client互不踢、單owner和saved/effective分離（PMQ-R2）。

## 2. 精確與可恢復發布
- [ ] 2.1 [after: 1.3] 原始decimal從reader到state/publisher不先float64捨入；逐點時間品質可追蹤（PMQ-R3）。
- [ ] 2.2 [after: 2.1] 實作sampleId固定重送、逾時unknown、失敗cache guard和durable dedup/domain原子協作（PMQ-R4）。
- [ ] 2.3 [after: 2.2] nonempty virtual＋全員有效＋公式revision；未審comparison不進physical accounting，但不擋G工程成果（PMQ-R5）。
- [ ] 2.4 [after: 2.3] 分raw live/retained diagnostics、source-required和品質limitation approval；不回溯改Solar retained（PMQ-R3/R7）。

## 3. Receiver與遷移
- [ ] 3.1 [after: 2.4] physical v1共用preview/runtime gate、registry/token綁定；不以$.value模擬協議（PMQ-R6）。
- [ ] 3.2 [after: 3.1] CL legacy/v1 shadow與single-writer cutover；測中斷回退不刪history和managed filters（PMQ-R8）。
- [ ] 3.3 [after: 1.1] KN啟用關卡轉接G，允許已確認工程成果先接，不等CL raw盤點、site-main或DDE清單（KNP-R1/R2）。

## 4. 驗收
- [ ] 4.1 [after: 3.2] 跑physical PM案例與適用的Windows/DDE/module tests；不把獨立Go modules當root verify已涵蓋。
- [ ] 4.2 [after: 3.3] 驗證八工程交接、payload/mode/排程／補收與typed profile gate，缺資料的工程保持未配置（KNP-R3/R4）。
- [ ] 4.3 [after: 4.1, 4.2] 對最終產品跑focused checks與pnpm verify、官方CLI與人工驗收；全部通過才archive，文件提交不勾實作完成。
