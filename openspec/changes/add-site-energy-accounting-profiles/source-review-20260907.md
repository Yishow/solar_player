# E6 source review binding（2026-09-07）

使用者確認沿用既有來源版本做內部檢查，不新增版本選單、手填版本號或設定步驟。本輪落實 E6 task 1.13 / E6-R6-S04，並釐清 E2 `definitionRevision` 是 server-resolved E1 來源版本集合；不是公式 registry revision。

## 行為與範圍

```text
選電錶 -> 預覽 -> 伺服器記錄來源 snapshot -> 確認套用
                                            |
                          來源相同 -> transaction 建立 profile
                          來源變更 -> 409、保留草稿、重新預覽
```

- Snapshot 包含 concrete scope 所選總錶、所有部門與 meter-set 分母的 channel，去重排序後綁定來源 identity/revision/epoch、measurement、unit/scale、timestamp policy、enabled/review status、cadence、boundary tolerance。
- 排除 display names；純改名或修改其他 channel／廠區不使本次預覽失效。
- 不存在、未啟用、未審核、非能源量測或格式錯誤的部門／meter-set membership 在 preview 回 `PROFILE_SOURCE_UNAVAILABLE`（422）與欄位；不建立 token。
- Migration `050_profile_source_review.sql` 只為 `profile_preview_tokens` 新增 nullable `source_snapshot_json`。舊 token 缺 snapshot 必須重新預覽，不自動補成有效憑證。
- apply 在既有 immediate transaction 內比對 snapshot，衝突不新增 profile 或 receipt。成功 idempotency receipt 優先回放，來源後來變更不破壞已成功請求的重試。
- UI 對來源衝突／舊 token 清除預覽、保留草稿與選擇；422 顯示中文提示；503 等暫時錯誤保留原 token 重試。

## 驗證證據

- Main API RED：來源變更後原實作 apply 回 200（應為 409）；未知來源 preview 回 200（應為 422）。
- Main UI RED：來源衝突原本顯示技術 code 且仍停留確認套用；新增不可用來源分支也先驗證 RED 再修正。
- Worker service RED：13 tests 中 7 PASS / 6 FAIL，再完成來源 snapshot 檢查。主代理審查後另補 malformed membership 拒絕、實際跨集合 dedup 與其他廠區 cadence 變更測試。
- Main 最後版 focused server：18/18 PASS（service、API、Q1 journey、Q1 consumers）；UI：5/5 PASS。
- Main 已回讀新 helper、migration、service/UI 增量 diff 與測試；Standards reader 的 UI/route 範圍無新增 findings。Spec reader 因用量限制中止，未提供 final review；主代理依 E6-R6-S04 親自完成全選取範圍、來源可用性／計算設定、名稱排除、舊 token、原子性、idempotency 與無新增版本 UI 的逐項審查，沒有未修復的本輪 findings。
- 第一次完整 gate 在 web build 因新增測試的陣列索引可能 undefined 而 FAIL；補上明確存在斷言後，web TypeScript 檢查與 UI 5/5 PASS。保留失敗 log；修正後完整 `rtk pnpm verify` 七階段 PASS（exit 0）：shared 147/147、server 925/925、web 1440/1440、deploy 110 PASS / 1 SKIP、server-runner 14/14。部署測試既有 real-flock 環境跳過項仍未驗證。
- E2/E6 `spectra analyze`：0 findings；`spectra validate`、`git diff --check`：PASS。

## 完成邊界

本輪不等於 E2/E6 全案完成。E2 正式 resolver 的來源版本集合驗證、draft 數值 calculator、E2-R2-S05 calendar 整合與 period/asOf review context 仍待原 task 1.3 / E6 task 1.5；完整 accounting eligibility/topology、history、interval/daily coverage 亦仍依既有 tasks 追蹤。

驗證使用本機 SQLite fixtures、Fastify inject 與 JSDOM；不是 rendered browser、正式 DB migration、MQTT broker、FHD 或現場驗收。未 stage、commit、archive 或部署。

Checkpoint：`.scratch/profile-source-review-20260907/`；保留前輪全部 WIP 與 checkpoint。

E6 task 1.13 已勾選，整體 3/13；task 1.5 與 E2 task 1.3 保持未完成。最後 gate 期間 application source hashes 未變；checkpoint 保留完整 WIP patch、檔案雜湊與兩次 gate logs。
