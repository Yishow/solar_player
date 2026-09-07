# Tasks｜建立每廠區總用電、部門來源與占比基準設定

狀態：已完成；唯一廠區會計 profile、日曆時區權威、來源快照審查與全流程驗證已全數通過。

前置：E1 / add-meter-reading-contracts

## 1. Implementation and Verification

- [x] 1.1 **Tests** — 先建 CL/KN 隔離與 siteTotal/denominator 分離的 red tests，並覆蓋總錶／部門重選只產生 profile revision、不改 E1 source revision/epoch/baseline。（Each concrete site owns one authoritative accounting profile；E6-R1 E6-R2 E6-R4）
- [x] 1.2 **Model** — 依 Profile結構與唯一權責（D1）實作 versioned profile、`siteTimeZone`、source references、department identities 與 site boundary schema；E1 source 不保存 site-main/department 或 `departmentId`。（Site total sources are selected separately from share denominators；Department numerators have explicit multi-meter membership；三種角色，不讓分母改掉首頁總用量；E6-R1 E6-R2 E6-R3 E6-R4）
- [x] 1.3 **Validation** — 驗證 concrete site、measurement kind、`energyFlowRole`、normalized unit、已知重疊、未知 topology confirmation 與 IANA `siteTimeZone`；允許合法父分母／子分子，拒絕把來源名稱當 accounting ownership。（Validation prevents incompatible units and overlap without forbidding legitimate hierarchy；One explicit comparison basis applies to each share group；能源語意與重複計算；E6-R4 E6-R5）
- [x] 1.4 **Persistence** — 新增 profile、revision、audit、siteTimeZone 與 effective interval 儲存；總錶／部門重選只寫 E6 revision，additive migration 不自動猜測生產設定或重設 E1 source baseline。（Each concrete site owns one authoritative accounting profile；Effective-dated profile changes preserve historical meaning；E6-R1 E6-R7）
- [x] 1.5 **API** — 依 API與狀態（D4）實作 GET、唯讀 preview interface、version-bound apply 與 idempotency；允許 server-validated `draft.siteTimeZone` 在綁 expected persisted revision 的 review context 預覽，但拒絕 draft 外 caller timezone/start/end override；profile revision 提供 E2 calendar/membership lookup，後續數值 resolver 仍以 calculator seam 注入 E2/E3/E5。（Preview and activation are version-bound and atomic；E6-R6）
- [x] 1.6 **State** — 分開結構未完成、已設定待資料、可用及衝突；空值提供欄位定位與動作，siteTimeZone 或 structural choice 缺失時不得 fallback 到 OS/source timezone。（Valid configuration and sufficient data are separate states；E6-R9）
- [x] 1.7 **Consumer Contract** — 建立 profile-following 與 legacy/custom 消費端識別、影響報告與 revision cache 契約，所有 consumer 讀同一 siteTimeZone/membership revision。（Consumers share accounting configuration without duplicating it in page drafts；E6-R8）
- [x] 1.8 **History** — 依版本與歷史（D5）實作往後生效、封存期間歸屬、timezone 變更新 revision、跨版本標示及非破壞 rollback 契約；closed history 不無聲重算。（Effective-dated profile changes preserve historical meaning；E6-R7）
- [x] 1.9 **Compatibility** — 依舊設定與展示（D6）清冊只形成待確認候選；不改 broker/topic ownership，不複製 page-owned 分母，不把 E1 source role 當 siteTotal/department ownership。（Consumers share accounting configuration without duplicating it in page drafts；E6-R3 E6-R8）
- [x] 1.10 **Verification** — 跑全部 profile API/shared/db 測試及 pnpm verify；記錄 UTC source／Asia/Taipei profile 月界線、timezone override／unknown revision、profile 外 channel、reassignment source-state preservation 與實際證據。（Profile site time zone is the calendar authority；E6-R1 E6-R2 E6-R3 E6-R4 E6-R5 E6-R6 E6-R7 E6-R8 E6-R9 E6-R11）

- [x] 1.11 **V3 MQTT integration** — 依 Guided MQTT sources integrate through the authoritative site profile 串接受控已接收資料清單/穩定tag來源與原任務，依新增契約驗證，不再要求外部client/手填mapping；此change只實作本層整合。（E6-R10）
- [x] 1.12 **Calendar** — 驗證 Profile site time zone is the calendar authority：E1 `sourceTimestampTimeZone=UTC` 的 normalized instant 依 E6 `siteTimeZone=Asia/Taipei` 形成月界線；任何 timezone/start/end override、unknown profile revision 或 closed-history silent recalculation 均被拒絕或保留原 revision。（E6-R11）
- [x] 1.13 **Source review binding** — 依 D4/D5 與 E6-R6-S04 自動捕捉全部所選 E1 source snapshot，套用時在 transaction 檢查來源衝突，保留 idempotent replay；UI 不新增版本欄位，衝突後保留草稿並回到預覽。以 server source-change/legacy-token/name-only/scope-isolation/rollback tests、UI conflict/re-preview test 與 pnpm verify 驗證。

## Closeout Notes

每個 task 完成時記錄測試名稱、指令、exit code 與證據路徑：
- Server 測試：`pnpm --filter @solar-display/server test src/routes/site-energy-profiles.test.ts src/services/siteEnergyProfileService.test.ts src/services/siteEnergyProfileSourceReview.test.ts src/routes/energy-authoring-consumers.test.ts` — exit 0（17 pass）。
- Shared 測試：`pnpm --filter @solar-display/shared test src/siteEnergyProfile.test.ts` — exit 0（6 pass）。
- Web UI 測試：`pnpm --filter @solar-display/web test src/pages/DataHub/SiteEnergySetupPanel.test.tsx` — exit 0（5 pass）。
- Q1 整合旅程：`src/services/energyAuthoringJourney.test.ts` — exit 0。
- 交付 gate：`pnpm verify` 實機執行全量通過。
