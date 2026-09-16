## 1. Physical profile 不越界 (F1. 兩類來源，不互相冒充)
- [x] 1.1 對齊PMQ與G的KNE/EPR分工：physical要求不套KN工程來源；以sourceKind測不同gate和拒絕fallback（對應 Power acquisition remains upstream and independently operated、Physical meter receiver validation enforces shared protocol gates and token binding、F1. 兩類來源，不互相冒充）。
- [x] 1.2 盤點CL 20 raw/10 virtual與實際部署差異，只對選用DDE的部署驗證VIEW同Session及禁止service（對應 Power acquisition remains upstream and independently operated、KN registry begins with engineering results rather than physical points）。
- [x] 1.3 [after: 1.2] 新增site/publisher/Client ID與版本化physical topic；測同broker兩client互不踢、單owner和saved/effective分離（對應 Versioned power topics and publisher identities prevent cross-site collisions、F2. Physical profile 保留的改善）。

## 2. 精確與可恢復發布 (F2. Physical profile 保留的改善、F3. Raw virtual 與權威工程成果)
- [x] 2.1 [after: 1.3] 原始decimal從reader到state/publisher不先float64捨入；逐點時間品質可追蹤（對應 Power values preserve original precision and distinguish all clocks、Failed or replayed acquisitions cannot become new healthy measurements）。
- [x] 2.2 [after: 2.1] 實作sampleId固定重送、逾時unknown、失敗cache guard和durable dedup/domain原子協作（對應 Failed or replayed acquisitions cannot become new healthy measurements、Retained diagnostics and live power delivery stay separate）。
- [x] 2.3 [after: 2.2] nonempty virtual＋全員有效＋公式revision；未審comparison不進physical accounting，但不擋G工程成果（對應 Virtual publication remains distinct from physical accounting、F3. Raw virtual 與權威工程成果）。
- [x] 2.4 [after: 2.3] 分raw live/retained diagnostics、source-required和品質limitation approval；不回溯改Solar retained（對應 Retained diagnostics and live power delivery stay separate、V1 admission validates the envelope before reusing M2 and E1、F2. Physical profile 保留的改善）。

## 3. Receiver與遷移 (F4. 共用工具、分開的domain、F5. 遷移與回退)
- [x] 3.1 [after: 2.4] physical v1共用preview/runtime gate、registry/token綁定；不以$.value模擬協議（對應 V1 admission validates the envelope before reusing M2 and E1、F4. 共用工具、分開的domain）。
- [x] 3.2 [after: 3.1] CL legacy/v1 shadow與single-writer cutover；測中斷回退不刪history和managed filters（對應 Power migration is additive and preserves one reviewed accepted path、F5. 遷移與回退）。
- [x] 3.3 [after: 1.1] KN啟用關卡轉接G，允許已確認工程成果先接，不等CL raw盤點、site-main或DDE清單（對應 KN registry begins with engineering results rather than physical points、KN begins per engineering and chooses measurement meaning explicitly、KN rollout is independently reversible and preserves records）。

## 4. 驗收
- [x] 4.1 [after: 3.2] 跑physical PM案例與適用的Windows/DDE/module tests；不把獨立Go modules當root verify已涵蓋。
- [x] 4.2 [after: 3.3] 驗證八工程交接、payload/mode/排程／補收與typed profile gate，缺資料的工程保持未配置（對應 KN commissioning follows report and mode-specific evidence gates、KN staged rollout preserves unconfigured states and factory coverage labels、KN rollout is independently reversible and preserves records）。
- [x] 4.3 [after: 4.1, 4.2] 對最終產品跑focused checks與pnpm verify、官方CLI與人工驗收；全部通過才archive。
