# Design｜以累積電錶差值計算日／月／年用電

## Context

DailySummaryService 在 service initialize 時用當下 counters 作 baseline，日期切换時以當下 counters 結束舊日並開始新日；負差以 max(...,0) 截掉。MetricResolver 同時存在 JS local-day 與 SQL/UTC date 邊界。這些是程式觀察，不代表已用現場資料重現所有症狀。

## Goals / Non-Goals

**In scope**：新增唯一期間差值 resolver，以 server-verified E6 accounting profile revision 的 siteTimeZone、profile-validated source membership 與 normalized source observation instant 解析期間。E1 source 只提供物理來源、measurement kind、energyFlowRole 與已驗證的 timestamp normalization；保留可稽核基準、端點樣本、品質、缺口與演算法版本；所有 downstream 用同一契約。

**Out of scope**：不新增電價引擎、不對缺日線性補值、不將未知 reset 當 0、不對輸入已是 daily delta 的 channel 再做一次差值；不在本 change 改 UI；不在 E1 source definition 保存 site-main/department、departmentId 或 accounting calendar；不接受 caller 自訂 timeZone、start 或 end。

## Dependencies

E1 / add-meter-reading-contracts 提供物理來源、measurement kind、energyFlowRole、source revision/epoch 與已 normalized 的 source observation instant；E1 負責無 offset timestamp 的解析與 `SOURCE_TIMESTAMP_INVALID` 診斷。E6 / add-site-energy-accounting-profiles 提供 siteTimeZone、siteTotal、departments、shareBasis 與 profile revision；E2 明確依賴 E6 的 profile lookup，但 E6 的數值預覽只可注入 calculator seam，不反向建立 runtime dependency。

所有新介面都必須在 shared 型別、server 驗證、呼叫端與測試之間一致。未知現場單位、採樣頻率與既有來源身分不可靠名稱猜測；來源的 accounting 角色只能由 E6 profile 決定。

## Decisions

### D1. 期間定義

指定且經 server 驗證的 E6 profile revision 之 `siteTimeZone` 是唯一 day/month/year calendar boundary authority，必須是 IANA timezone；本 change 不設定預設時區。day/month/year 分別從該 profile revision 的當地日初/月初/1月1日00:00 到由 period selection 與 asOf 決定的查詢截止；完成期間為 [start,end)，累積值在 end 邊界是前一期間的終點和下一期間的起點，不重複分配。查詢 clock 必須可注入測試，不依作業系統 TZ。

E2 消費 E1 已 normalized 的 UTC instant 與時間品質，或 D3 明確允許的 receive-time estimate，不自行解析 raw timestamp。E1 對無 offset timestamp 使用 sourceTimestampTimeZone；缺少、無效或歧義時以 `SOURCE_TIMESTAMP_INVALID` 拒絕／隔離，不猜 profile 或 OS timezone。sourceTimestampTimeZone 與 profile siteTimeZone 不同是合法的，解析後仍一律依 profile timezone 分期。

### D2. 數學

連續、未歸零且端點可用：E = normalized(end) − normalized(start)。`meterIds` 只選待計算的物理 channels，服務端必須驗證它們屬於指定 E6 profile revision 的相關 membership；caller 不得藉此設定部門或總錶角色。多錶先各自差分，再按 server-verified E6 profile 的明確非重疊 membership 加總；不得把不同時刻／epochs 的 registers 混在一起。有效 interval-energy 依 E1 energyFlowRole 與 measurement kind 加總一次，power-gauge 不走 counter delta。

### D3. 邊界選擇

先找精確 sourceTimestamp；沒有時僅可用 boundary 之前、且距離不超過來源 boundaryMaxAgeSeconds 的最後一筆，結果標 estimated-boundary 並回傳實際樣本時間與偏移。E1 approved 的 `timestampQuality=receive-time-estimated`、`sourceTimestamp=null` packet 可用 receivedAt 作為這個有界估計，但即使恰逢 boundary 也不得標 exact；retain=true 且無可信 source timestamp 的 replay 不會成為 accepted observation，不能更新 accepted history、baseline 或 freshness。初始設計預設300秒，可由來源設定調整，不是已確認現場採樣頻率。禁止從 boundary 之後倒推期初。

### D4. 缺資料

缺月初／年初基準時 valueKwh=null，observedDeltaKwh 可呈現已觀測區間差值但必須標 partial；第一筆是 baseline 不是用量。缺日不填0、不補直線。月初與月底均可證實時月總差可正確，即使內部缺每日分配，須另列 dailyCoverage。

### D5. 歸零／換錶／翻表

負增量不以 max(0) 吞掉，也不取絕對值。需要明確的 reset/replacement event。只有舊錶結束與新錶起點均有可信證據時才加總連續 segments；缺任一段標 partial。rollover 僅於設定 modulus 且通過合理性檢查時使用 modulus−previous+current；未知負差 invalid。

### D6. 重啟與亂序

baseline 與 accepted observations 持久化；重啟不重新選「現在」為日初。不以接收日期取代 normalized source instant。E2 消費 E1 已正規化的 UTC instant，再依 profile siteTimeZone 分期；舊資料補到時重新計算受影響期間，去重及 revision 保證可重入。

### D7. 品質與舍入

quality=exact/estimated-boundary/partial/unavailable/invalid；freshness 另用既有 policy，真實0與沒有值不同。valueKwh 保留 decimal 字串至 API adapter 確認安全範圍，顯示才舍入；不得把每天先四捨五入再算月總。

### D8. 期間截止一致性

to-date 以請求 asOf 定義共同結束邊界；找不到正好 asOf 的樣本時仍依300秒或來源設定的向前取樣限制標 estimated-boundary，calculatedThrough 記實際截止。已完成的歷史期間以是否覆蓋其終點判斷完整性，不因今天沒有新訊息就把去年完整資料變成無效。siteTimeZone 變更必須建立新的 E6 profile revision；closed history 保留原 profile revision，不因新時區無聲重算。

### D9. Profile lookup precedes calculation

2026-09-07 契約釐清：本 change 的 `definitionRevision` 指由伺服器解析的 E1 來源版本集合，形狀為 `Array<{channelId,meterId,sourceRevision,epochId}>`，scope 由外層 concrete `metricScope` 決定；不是 derived metric registry 的公式 revision，也不新增版本計數器或 UI 欄位。E6 preview 自動捕捉所選來源，apply 驗證該 review snapshot 仍有效。正式歷史 resolver 必須依選定 profile／期間的來源證據驗證版本，不可用最新來源取代歷史版本。本輪只落實 E6 review 綁定；E2 resolver 接入與 draft 數值預覽仍依 task 1.3 驗收。

resolver 保留 `metricScope`、`meterIds`、`definitionRevision`，並要求 `profileRevision`、`periodSelection` 與 `asOf`。服務端依 metric scope/profile revision 讀取 siteTimeZone 與來源 membership，驗證 meterIds 屬於該 revision 的相關 membership 及 definition revision 存在且可用；caller 傳入 timeZone、start、end 或未知 profile revision 時拒絕，不以 caller 輸入或 OS timezone fallback。

E6 草稿預覽在既有 calculator seam 內，透過相同 lookup 注入 E6 已驗證且不可變的 review snapshot（含 expected persisted revision、draft membership/siteTimeZone 與 source revisions）；這不是公共 caller 的 timezone override。預覽結果標示 review context reference，不能當 persisted profile revision 或寫入正式 history/cache；正式報表仍只解析 persisted revision。

## API / Data / State Contracts

`resolvePeriodConsumption({metricScope,meterIds,periodSelection,asOf,profileRevision,definitionRevision})` 由服務端查出 E6 profile 的 validated source membership 與 siteTimeZone，驗證 meterIds 只選該 profile revision 允許的物理 channels，回傳 `valueKwh`、`observedDeltaKwh`、`quality`、`freshness`、`periodStart`、`periodEnd`、`calculatedThrough`、`baselineSampleIds`、`endSampleIds`、`boundaryOffsets`、`issues`、`calculationVersion` 及 `provenance:{profileRevision,siteTimeZone,sourceRevisions}`。`periodSelection` 只描述 day/month/year 與其 local calendar key；caller 不得傳 `timeZone`、`start` 或 `end` 改寫 profile membership／calendar boundary，也不得用 meterIds 設定 accounting role。所有欄位由服務端產生，前端不得另算一套。

錯誤回應保留既有管理／播放權限邊界；新增錯誤提供穩定 code、可理解訊息與可定位的欄位或 item。缺資料用 null＋品質，不以空字串、NaN 或 0 掩蓋。未識別的 scope、meter、definition revision、profile revision 或 item 不自動改成 CL；`TIME_ZONE_OVERRIDE_FORBIDDEN`、`CUSTOM_PERIOD_BOUNDARY_FORBIDDEN`、`PROFILE_REVISION_NOT_FOUND`、`PROFILE_METER_MEMBERSHIP_MISMATCH` 與 E1 的 `SOURCE_TIMESTAMP_INVALID` 必須可被測試辨識。

## Implementation Contract

- **Behavior**：日／月／年 resolver 只能使用 server-verified E6 profile revision 的 siteTimeZone 與 validated source membership；E2 消費 E1 已 normalized 的 UTC instant，再由 profile timezone 決定 calendar boundary。總錶／部門重選只改 E6 profile revision，不改 E1 source revision、accepted samples 或 baseline。
- **Interface / data shape**：輸入保留 `metricScope`、`meterIds`、`periodSelection`、`asOf`、`profileRevision`、`definitionRevision`；輸出包含 period result 與 `provenance.profileRevision/siteTimeZone/sourceRevisions`。不得提供 timezone override 或任意 start/end；meterIds 只可選 profile revision 已驗證的物理 channels。
- **Failure modes**：未知／過期 profile revision、profile membership mismatch、timezone override、任意 boundary 或 E1 已標記 `SOURCE_TIMESTAMP_INVALID` 的 observation 均不產生 period result；E2 不自行解析 raw timestamp，也不 fallback 到 profile／OS timezone。
- **Acceptance criteria**：E2-R2 的 UTC source／Asia/Taipei profile boundary fixture、override／unknown revision rejection tests、E2-R3-S03 的 receive-time-estimated／retained replay fixture、E6-R1 的 profile-only reassignment fixture，以及本 change test-plan 的其他 scenarios 通過；`spectra analyze fix-period-consumption-deltas --json` 及 `spectra validate fix-period-consumption-deltas` 無 Critical/Warning 或 validation error。
- **Scope boundaries**：本 change 只定義 resolver、profile lookup seam、normalized source instant consumption 與 period calculation contract；不修改 E1 source schema/parser、E6 UI/API 實作、MQTT transport、closed-history migration 或本 change 以外的 runtime。

## Migration and Rollout

以 shadow resolver 對照 E1 samples，不立即替換舊 summaries。先通過固定邊界／重啟 fixture，再交 E3 產生新 projection。profile revision 與 siteTimeZone 的變更以新 revision 計算新期間；回退只切 reader version，不重設電錶或 baseline，也不無聲重算 closed history。

改動採 additive 相容策略；migration 編號與既有型別細節於 apply 對照最新 main，不能依文件預占流水號。任何重算須以副本 dry-run 和差異報告先驗證，正式資料套用另行授權。

## Risks / Trade-offs

首次導入時可能沒有歷史月初／年初樣本，此時不能保證補出完整期間；estimated-boundary 與 exact 必須分開。區間內 gap 與期間邊界 gap 不是同一種品質。

## Verification Strategy

同目錄 test-plan 是 requirement-to-scenario 驗證對照；具體觀測條件以 specs 的 WHEN / THEN 為準。先寫失敗測試，再實作，再跑 regression。不得只修改 test expectation 讓既有錯誤數字通過。

## Source of Progress and Closeout

只有同目錄 tasks.md 的 checkbox 表示本 change 的實作進度。本包全部未勾選；格式檢查或公式 fixture 通過不代表應用程式測試通過。待實作後保存實際命令輸出、review findings 與必要 FHD witness；使用者驗收及 archive/commit 規則依 repo 現行 workflow。
