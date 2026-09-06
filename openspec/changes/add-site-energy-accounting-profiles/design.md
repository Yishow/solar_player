# Design｜廠區用電計算設定的唯一資料來源

## Context

v1 E5說明了計算分母但沒有定義可供操作員管理的完整profile。既有CircuitSettings呈現topic、額定值、顯示slot與門檻，不是完整分子/分母設定器。主頁用量、部門占比若各自持有來源映射，容易設定不一致。

## Goals / Non-Goals

**In scope**：每廠區獨立、可版本化的siteTotal/department sources/shareBasis；以單一管理API支援U6設定流程；E3/E4/E5/U4使用同一設定。

**Out of scope**：任意formula DSL、推估未知錶的實體範圍、將市電購電自動等同含太陽能的廠區用電、後台未授權的歷史修改。

## Dependencies

E1 / add-meter-reading-contracts。此change定義profile及resolver接口；實際期間數值運算由E2/E3/E5負責。不得因依赖profile預覽而讓E6反向依賴E5造成循環。

## Decisions

### D1. Profile結構與唯一權責

Proposed SiteEnergyProfileV1：
- profileId、metricScope(cl|kn)、schemaVersion、revision、effectiveFrom、status、siteTimeZone。
- siteTotal：{kind: unconfigured|meter-set, label, memberChannelIds, boundary, coverageReview}。
- departments：[{departmentId, nameZh, memberChannelIds, accountingIncluded, coverageReview}]。
- shareBasis：{kind: site-main|department-sum|meter-set, departmentIds?, memberChannelIds?, label?, boundary?}。
- audit：actor、reason、previousRevision、sourceRevisions、effective interval。

site-main沿用v1命名但指向siteTotal，可為一枚總錶或多枚並聯總進線錶。數值不儲存在profile，來源識別不靠易變的中文名稱。顯示順序、顯示/隱藏、顏色與day/month/year留在page config，不改accountingIncluded。

### D2. 三種角色，不讓分母改掉首頁總用量

廠區總用电來源是首頁日/月/年與月圖的來源。部門來源形成每個分子。shareBasis只是各部門的比較基準；改成「已選部門合計」或指定生產範圍，不會把首頁全廠用量變成那個小範圍。

指定比較meter-set是一個明確的進階選項，不是任意算式。所有部門必須位於相同reviewed比較邊界內；非同邊界的獨立比例不能混進同一張占比分布圖。

### D3. 能源語意與重複計算

E1-reviewed cumulative-energy channels是初始正常路徑；未驗證的舊映射標needs-review；kW不可選來相減；若E2/E3支援reviewed interval-energy，標明其本身已是區間量、不可再次差分。不同來源的原始讀數先分別經期間resolver再加總。

同一加總集合禁止重複channel或已知祖先/子孫重疊；部門集合禁止重複涵蓋。分子子錶與分母父錶則是合法包含關係，不適用同組加總禁則。未知topology由操作員確認量測邊界是否互不重複，不能只靠相似名稱推斷。即使原始資料都叫kWh，也須辨別用電/購電/回售/發電；有太陽能自用的場景不得盲用市電進口總錶當全廠耗電。

### D4. API與狀態

Proposed authenticated management endpoints：
- GET /api/data-hub/sites/:scope/energy-profile：active profile、editable baseline、source inventory eligibility、consumer summary。
- POST /api/data-hub/sites/:scope/energy-profile/preview：{draft,expectedRevision,periodSelection}；唯讀resolver、opaque previewToken，無MQTT或保存副作用。
- POST /api/data-hub/sites/:scope/energy-profile/apply：{draft,expectedRevision,previewToken,idempotencyKey}；單一transaction建立revision並切active。
- GET /api/data-hub/sites/:scope/energy-profile/revisions：授權查歷史版本；rollback仍走preview/apply。

draft/preview/active型別分開；profile/schema/source revision錯誤422/409明確回欄位path、中文描述、返回的step及可修動作。previewToken與服務端review snapshot綁定具體profile/source revisions和有效期間；期限由repo共用review契約配置，過期需重新preview。成功只說「廠區設定已套用」，不說裝置已更新。

### D5. 版本與歷史

預設往後生效；保留每段有效版本。已關閉期間不無聲改寫。進行中的月/年如跨過不同計量成員，標partial/segmented；不可拼成未註明的新口徑比率。另開歷史修復時先有界dry-run，再明確授權。CL修改不invalidate KN cache；cache key需包含site、profile revision、source revisions、period、algorithm version。

### D6. 舊設定與展示

初次遷移整理circuit/metric inventory為待確認候選，不把displaySlot、topic字串或固定百分比自動當成計量證據。已有profile-following卡片套用後重取一致版本。舊custom/pinned bindings必須列成不自動跟隨的例外，提供單獨確認遷移；未確認前不得宣稱全頁都跟隨。

## Migration and Rollout

先新增profile schema與read-only inventory/draft API，保持舊資料，再接E3/E5 resolver及U6。各site首次套用需確認membership和影響。回退active reader/profile pointer時新增審計事件；不刪raw samples、不復活固定示意百分比。歷史修復不是UI預覽的副作用。

## Verification Strategy

依spec及test-plan驗證獨立廠區、多總錶、合法父分母/子分子、非法父子重複合計、unknown topology、來源範圍不符、版本衝突、部分資料與既有自訂綁定。E6先以注入計算器測API契約，真實resolver跨change由Q1驗收。

## V3 MQTT Source Integration

新增E6-R10：以M1/M2補齊來源探索→穩定tag選擇→批次preview/apply。此change維持原有單一權責，UI不再要求先到外部client查訂閱/publish後手抄Topic。M1/M2為新的前置/整合契約，不代表功能已在main。
