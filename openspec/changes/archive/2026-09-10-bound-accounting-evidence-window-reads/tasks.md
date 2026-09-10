## 1. 固定先決契約與量測基準

- [x] 1.1 先確認 fix-calendar-consumption-unavailable-results 已完成實作與驗證，再以該版本作為本案 oracle；回讀其 final diff 並重跑 periodConsumptionService 與 metrics-history focused suites，確認 unavailable／zero／no-profile 契約未退回，禁止兩案平行修改共同 service／spec。
- [x] 1.2 完成 1.1 後，在新的 apps/server/src/services/accountingEvidenceSelection.test.ts 建立 full-load loader＋既有 shared resolver 的 differential fixture harness，保留 sample IDs、issues 順序、decimal strings 與 coverage；以自我對照及少一筆 baseline 的負例驗證 harness 能識別結果差異，不複製 production 演算法。
- [x] 1.3 完成 1.1 後，在 apps/server/src/services/meterReadingService.test.ts 建立可重跑 query／row-count 記錄、固定 seed 與原始 EXPLAIN QUERY PLAN baseline；以同站 10,000／100,000 無關歷史與其他 channel／scope fixtures 證明目前無界 loader 的讀取放大，僅操作隔離測試 DB。

## 2. 建立必要證據選取

- [x] 2.1 落實「有界選取契約」及 Accounting reads select a bounded evidence closure，在 apps/server/src/services/accountingEvidenceSelection.ts 定義 request-local immutable context，先選 profile revisions、member channels、完整五欄 identity、真實 windows 與 eligibility 模式；以 selector suite 驗證 cross-scope、multi-profile 與 active identity 不可取代歷史 identity。
- [x] 2.2 在 apps/server/src/services/meterReadingService.ts 提供有界 window／fingerprint rows 查詢，保留 source join 五欄與原 reading_id 指紋排序、每個完整 identity 的 start 前 baseline；以 meterReadingService suite 對照原 projectionSamples row set，驗證不同 revision／epoch、窗口端點與 latest-prior ties 不漏列。
- [x] 2.3 落實「邊界證據閉包與排序」：選取 calculation 所需 closing、同 identity opening、從 opening 起的跨 identity continuity evidence 及 equal-instant ties，保持 source-time／receive-time precedence、毫秒排序、半開 contribution 與 draft receive cutoff；用 selector differential fixtures 驗證 stale opening、closing 早於 start、reset／rollover、offset timestamps、late arrivals 與 interval-energy 等價。
- [x] 2.4 依「查詢索引與容量驗證」檢查 bounded query plans，僅在現有索引不足時新增 apps/server/src/db/migrations/052_accounting_evidence_query_indexes.sql 的非唯一純索引；若編號已占用先同步 artifacts 的新路徑。以 EXPLAIN、隔離 DB migration／舊 loader 相容測試及 ingest／檔案大小對照驗證，不改舊 migration、row 值或 retention；不需新索引時留下 plan 證據。

## 3. 接線 request 與 projection

- [x] 3.1 在 apps/server/src/services/periodConsumptionService.ts 接線 loadEffectivePeriodContext 與 resolvePersistedPeriodConsumption，先取 context 再使用 bounded selection，保留明確全 scope loader 相容用途；以同名 suite 的 day／month／year／week／total oracle cases 證明數值、profile 選版及 canonical failure 不變。
- [x] 3.2 將 resolveDailyConsumptionPoints 接到同次 request 的窗口聯集與共享 selection，保留現有 shared sample index；以 periodConsumptionService suite 的一年 daily query instrumentation 證明不恢復每日期全站 load，並逐日 deep-equal full-load 結果。
- [x] 3.3 落實「同次快照與交易再驗證」的 request-local 部分，在 apps/server/src/services/consumptionProjectionService.ts 令 checksum／watermark 共用一次 fingerprint selection，shadow candidate 建立時驗證 fresh evidence；以同名 suite 的 read-count 與原始 fingerprint 對照證明單次選取及無 metadata checksum 的既有全 scope 語意。
- [x] 3.4 落實 Projection evidence reuse preserves transaction-time invalidation：activateProjection 在 immediate transaction 內重新選取 fingerprint，不沿用 request snapshot，保留 active id／context／watermark／checksum 檢查；以 consumptionProjectionService suite 注入相關 late observation、baseline 變動、future-only observation、stale active id，驗證 PROJECTION_INPUT_CHANGED／原衝突碼及零次 active-pointer 更新。

## 4. 等價、容量與最終驗證

- [x] 4.1 依 Bounded accounting reads prove equivalent results and measurable work 跑完整 differential matrix，包含 measured zero、missing／stale baseline、source replacement、revision／epoch、reset／rollover、receive estimate、late／future observations、profile 邊界與同時刻 ties；以 selector、meterReadingService、periodConsumptionService、consumptionProjectionService 及既有 shared periodConsumption suites 逐欄 deep-equal 驗證，包括 unavailable 診斷。
- [x] 4.2 執行固定 requested closure 的 10,000→100,000 無關歷史容量對照，以選取 row identities／materialized rows 不變、checksum＋watermark 一次 selection、activation 獨立 fresh selection 及 bounded/index-assisted plans 作硬門檻；在 openspec/changes/bound-accounting-evidence-window-reads/evidence/accounting-read-capacity.md 記錄 seed、環境、重跑命令、1 次 warm-up、7 次原始量測、median／p95、peak heap／RSS、索引成本及 baseline／optimized 結果，不當成正式容量驗收。
- [x] 4.3 執行 pnpm verify 與 git diff --check，回讀最終 diff／容量報告，確認不改前端、MQTT policy、資料值、retention 或 unavailable 主規格；記錄 PASS／FAIL／NOT RUN。只要等價、row budget、transaction invalidation 或 query-plan 門檻未過，就保持對應 task 未完成，不以全量 fallback 或本機延遲偶然較低宣稱完成。
