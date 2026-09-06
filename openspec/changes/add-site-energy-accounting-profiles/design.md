# Design｜廠區用電計算設定的唯一資料來源

## Context

v1 E5說明了計算分母但沒有定義可供操作員管理的完整profile。既有CircuitSettings呈現topic、額定值、顯示slot與門檻，不是完整分子/分母設定器。主頁用量、部門占比若各自持有來源映射，容易設定不一致。若 E1 source 同時保存 site-main/department 與 departmentId，會和 E6 profile 的 siteTotal/departments/shareBasis 形成兩套 accounting truth；若各層自行選 timezone，日／月／年邊界也會分歧。

## Goals / Non-Goals

**In scope**：每廠區獨立、可版本化的siteTotal/department sources/shareBasis 與唯一 siteTimeZone calendar authority；以單一管理API支援U6設定流程；E3/E4/E5/U4使用同一設定。

**Out of scope**：任意formula DSL、推估未知錶的實體範圍、將市電購電自動等同含太陽能的廠區用電、後台未授權的歷史修改。

## Dependencies

E1 / add-meter-reading-contracts 提供物理來源、measurement kind、energyFlowRole、source revision/epoch 與 normalized source timestamp；E1 不保存 site-main/department 或 departmentId。E2 / fix-period-consumption-deltas 消費 E6 profile 的 membership 與 siteTimeZone；此 change 定義 profile 及 calculator seam，不讓 E6 因數值預覽反向依賴 E2/E5 runtime 造成循環。

## Decisions

### D1. Profile結構與唯一權責

Proposed SiteEnergyProfileV1：
- profileId、metricScope(cl|kn)、schemaVersion、revision、effectiveFrom、status、siteTimeZone。
- siteTotal：{kind: unconfigured|meter-set, label, memberChannelIds, boundary, coverageReview}。
- departments：[{departmentId, nameZh, memberChannelIds, accountingIncluded, coverageReview}]。
- shareBasis：{kind: site-main|department-sum|meter-set, departmentIds?, memberChannelIds?, label?, boundary?}。
- audit：actor、reason、previousRevision、sourceRevisions、effective interval。

E1 source definition 只描述物理來源、measurement kind、energyFlowRole 與 normalized source timestamp；不得保存 `meterRole=site-main|department` 或 `departmentId`。`siteTotal`、`departments` 與 `shareBasis` 是 E6 唯一的 accounting ownership。`site-main` 只是在 `shareBasis` 中指向同一 profile 的 siteTotal，不是 E1 source role；同一 physical source 從部門改選為總錶只建立新的 E6 profile revision，不建立新的 E1 source revision/epoch，也不重設 baseline。

siteTotal可為一枚總錶或多枚並聯總進線錶。數值不儲存在profile，來源識別不靠易變的中文名稱。顯示順序、顯示/隱藏、顏色與day/month/year留在page config，不改accountingIncluded。`siteTimeZone` 是唯一 day/month/year calendar authority；sourceTimestampTimeZone 僅供 E1 解析無 offset timestamp，來源 timezone 與 profile timezone 不同仍可合法，因為 E1 先產生 UTC instant，E2 再依 profile calendar 分期。

### D2. 三種角色，不讓分母改掉首頁總用量

廠區總用电來源是首頁日/月/年與月圖的來源。部門來源形成每個分子。shareBasis只是各部門的比較基準；改成「已選部門合計」或指定生產範圍，不會把首頁全廠用量變成那個小範圍。

指定比較meter-set是一個明確的進階選項，不是任意算式。所有部門必須位於相同reviewed比較邊界內；非同邊界的獨立比例不能混進同一張占比分布圖。

### D3. 能源語意與重複計算

E1-reviewed cumulative-energy channels with explicit `energyFlowRole` 是初始正常路徑；未驗證的舊映射標needs-review；kW不可選來相減；若E2/E3支援reviewed interval-energy，標明其本身已是區間量、不可再次差分。不同來源的原始讀數先分別經期間resolver再加總。E1 role 描述量測語意（例如 consumption、generation、grid-import、grid-export），不描述 siteTotal 或 department ownership。

同一加總集合禁止重複channel或已知祖先/子孫重疊；部門集合禁止重複涵蓋。分子子錶與分母父錶則是合法包含關係，不適用同組加總禁則。未知topology由操作員確認量測邊界是否互不重複，不能只靠相似名稱推斷。即使原始資料都叫kWh，也須辨別用電/購電/回售/發電；有太陽能自用的場景不得盲用市電進口總錶當全廠耗電。

### D4. API與狀態

Proposed authenticated management endpoints：
- GET /api/data-hub/sites/:scope/energy-profile：active profile、editable baseline、source inventory eligibility、consumer summary。
- POST /api/data-hub/sites/:scope/energy-profile/preview：{draft,expectedRevision,periodSelection}；唯讀resolver、opaque previewToken，無MQTT或保存副作用。
- POST /api/data-hub/sites/:scope/energy-profile/apply：{draft,expectedRevision,previewToken,idempotencyKey}；單一transaction建立revision並切active。
- GET /api/data-hub/sites/:scope/energy-profile/revisions：授權查歷史版本；rollback仍走preview/apply。

draft/preview/active型別分開；profile/schema/source revision錯誤422/409明確回欄位path、中文描述、返回的step及可修動作。`draft.siteTimeZone` 可以在 preview 中改成新值，但必須由 server-validated immutable review snapshot 綁定 expected persisted revision、source revisions、draft siteTimeZone 與有效期間；這個 review context 只供 E6 calculator seam 預覽，不 activate 或持久化 domain state。previewToken與服務端review snapshot綁定具體profile/source revisions、siteTimeZone 和有效期間；期限由repo共用review契約配置，過期需重新preview。成功只說「廠區設定已套用」，不說裝置已更新。profile preview/apply 不接受 draft 外 caller timezone、start 或 end override；正式 period resolver 由 persisted profile revision lookup 取得 calendar authority。

### D5. 版本與歷史

預設往後生效；保留每段有效版本。siteTimeZone 任何變更都建立新的 profile revision，已關閉期間繼續使用原 revision，不無聲重算。進行中的月/年如跨過不同計量成員或日曆時區，標partial/segmented；不可拼成未註明的新口徑比率。另開歷史修復時先有界dry-run，再明確授權。CL修改不invalidate KN cache；cache key需包含site、profile revision、source revisions、period、algorithm version。

### D6. 舊設定與展示

初次遷移整理circuit/metric inventory為待確認候選，不把displaySlot、topic字串或固定百分比自動當成計量證據。已有profile-following卡片套用後重取一致版本。舊custom/pinned bindings必須列成不自動跟隨的例外，提供單獨確認遷移；未確認前不得宣稱全頁都跟隨。

## Implementation Contract

- **Behavior**：E6 profile 是 siteTotal、department membership、shareBasis 與 siteTimeZone 的唯一 accounting/calendar authority。E1 source 只提供物理來源與 energyFlowRole；總錶／部門重選只建立 E6 profile revision，不改 E1 source revision、epoch、accepted observations 或 baseline。
- **Interface / data shape**：`SiteEnergyProfileV1` 必須保存 `metricScope`、`revision`、`siteTimeZone`、`siteTotal`、`departments`、`shareBasis` 與 audit/effective interval。E2 resolver 取得 profile revision 後，仍可接受 `metricScope`、`meterIds`、`definitionRevision`、`periodSelection`、`asOf`；meterIds 只能選 server 已驗證的 profile membership，caller 不得傳 timezone、start 或 end override。preview 可用 `draft.siteTimeZone`，但只能透過綁 expected persisted revision 的 server-issued review context，不能把它當正式 persisted revision。
- **Failure modes**：缺少或未知 profile revision、無效 IANA siteTimeZone、profile 外 channel、已知 overlap、未知 topology 未經 review，以及任何 caller calendar override 均回 field-level 422/409；不得 fallback 到 source/OS timezone 或自動改採其他 site/profile。
- **Acceptance criteria**：E6-R1-S03 驗證 accounting reassignment 不動 source state；E6-R11-S01 覆蓋 UTC source／Asia/Taipei profile month boundary；E6-R11-S02 覆蓋 timezone override 與 unknown revision rejection；E6-R11-S03 覆蓋 timezone change 新 revision 與 closed-history provenance；preview/apply 的 profile/source revision conflict 維持 atomic。
- **Scope boundaries**：本 change 只定義 profile schema、ownership/calendar contract、management preview/apply 與 consumer provenance；不修改 E1 ingestion/parser、E2 period calculation implementation、MQTT transport、page-local formula 或 closed-history migration。

## Migration and Rollout

先新增profile schema與read-only inventory/draft API，保持舊資料，再接E2/E3/E5 resolver及U6。各site首次套用需確認membership、siteTimeZone和影響。回退active reader/profile pointer時新增審計事件；不刪raw samples、不復活固定示意百分比，也不因 timezone/profile revision 變更重設 source baseline。歷史修復不是UI預覽的副作用。

## Verification Strategy

依spec及test-plan驗證獨立廠區、多總錶、合法父分母/子分子、非法父子重複合計、unknown topology、來源範圍不符、版本衝突、部分資料與既有自訂綁定；補 UTC source／Asia/Taipei profile 月界線、timezone override/revision rejection，以及總錶／部門重選只改 profile 不改 source revision/baseline。E6先以注入計算器測API契約，真實resolver跨change由Q1驗收。

## V3 MQTT Source Integration

新增E6-R10：以M1/M2補齊來源探索→穩定tag選擇→批次preview/apply。此change維持原有單一權責，UI不再要求先到外部client查訂閱/publish後手抄Topic。M1/M2為新的前置/整合契約，不代表功能已在main。
