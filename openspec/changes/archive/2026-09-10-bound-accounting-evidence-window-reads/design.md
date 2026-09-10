## Context

server 的 loadAcceptedSamples 目前讀入指定站點全部 accepted readings；projectionSamples 再於 JavaScript 篩出 meterIds、窗口與每個完整來源身分的 baseline。checksum、watermark 和 shadow／activation 各次校驗會重新查詢。shared 的 indexSamplesByChannel 已經共用多日期索引，本案保留這項改善，不重做每日期掃描優化。

先決順序：先完成 fix-calendar-consumption-unavailable-results，再於其最終版本建立本案 oracle。兩案共同接觸 periodConsumptionService 和 consumption-history-projections 規格，但前者擁有 failure 語意、後者只改善 evidence 讀取。不存在其他 active／parked 效能案；已歸檔的 bound-long-range-history-recompute 是既有 shared 行為，不重新開啟。

## Goals / Non-Goals

**Goals / In scope:** 限制 period、daily points 與 projection 指紋所 materialize 的 rows；重用同次解析 evidence；保留 input checksum、即時交易再驗證及全部數值／診斷；留下可重跑的容量對照。

**Non-Goals / Out of scope:** 不更換 SQLite、不刪除或壓縮 accounting evidence、不改 retention、不改帳務公式或 rounding、不調整 preview／persisted 的 asOf 規則、不新增全域快取或背景重算、不直接信任 projection 跳過正確性計算。其他明確需要全站 raw evidence 的既有 public loader 保持相容。

## Decisions

### 有界選取契約

在 apps/server/src/services/accountingEvidenceSelection.ts 建立 request-local selector；meterReadingService 承接 SQL 存取並保留既有無界 loader 給未納入本案的明確呼叫者。選取 context 至少含 scope、memberChannelIds、已選 profile revisions、每個真實 window 的 start／end／through、asOf 及既有 receive-time eligibility 模式。immutable selection 提供解析 samples、projection fingerprint rows 與 query-count／row-count 的可測觀察點；不新增公開 HTTP 欄位或 telemetry 依賴。

先選 profile／window，再取對應 channel 的 evidence。身分使用 metricScope、meterId、channelId、sourceRevision、epochId 全部欄位，不能只鎖 active definition，否則會抹掉更換來源的 mismatch 診斷。多日期 request 合併實際需要的窗口與邊界證據，不以每一天再次讀全站歷史。

### 邊界證據閉包與排序

計算用 selection 與 projection 指紋用 selection 保持兩個明確 view，不誤用同一粗略時間 filter：

- 計算 view 保留各窗口 closing 所屬完整身分、該身分在 opening 邊界前最近的 observation，與 opening timestamp 到 through 之間所有相關 channel observation／同時間 tie。若 closing 在 start 之前，仍保留它來決定來源語意和 freshness。不可因 baseline 太舊就刪除，因為 stale baseline 仍影響 boundary IDs、issues 和 coverage。
- 原 shared resolver 用 opening 起到 closing 的序列判斷 continuity／reset／revision；必要時 selection 的起點必須延伸至實際 opening，包含介於 baseline 與 start 的其他身分，不能只保留一筆 baseline 而丟掉中間診斷。
- projection fingerprint view 維持原 projectionSamples 規則：member channel 的 start 至 calculatedThrough observation 加上每一完整身分最近的 start 前 baseline，最後按 reading_id 排序及原欄位序列化。checksum／watermark 不使用計算 view 的額外列。
- 同時間多筆資料、source timestamp 優先於 receive-time-estimated 的去重規則、reading ID tie-break 由現有 shared 行為決定；SQL 預選必須保留全部可能影響該判斷的 ties。
- 閉區間的 closing evidence 與半開的 interval-energy contribution 不混淆：end 的 observation 可證明前一期 closing，但不加入該期 interval-energy 累加。through 由原 min(end, asOf) 規則決定。
- persisted 歷史允許的 late-arriving source evidence 與 draft preview 的 receivedAt cutoff 是不同模式，不能一律增加 received_at <= asOf；select 的模式須符合原 caller，對照 oracle 固定此差異。

使用這個必要證據閉包，而非宣稱任何病態舊 baseline 都有固定大小。驗收的 bounded row budget 排除確實需要的歷史 continuity evidence；不把任意固定 row limit 當成效能解法。

### 同次快照與交易再驗證

resolvePersistedPeriodConsumption、loadEffectivePeriodContext 與 resolveDailyConsumptionPoints 在同次 request 共享已解析 context 與選取結果。對同一 projection snapshot，checksum 與 watermark 各做一次純運算，不各自再 load rows；shadow input 驗證使用建立 candidate 當下的一次 fresh selection，而非 caller 宣告過的任意快取。

activateProjection 的 immediate transaction 必須重新選取目前 fingerprint evidence，確認 input_checksum、expected active id、context key 與 watermark。不得拿 request snapshot 代替這次重讀。窗口內 late observation／baseline 改變仍拒絕 activation；calculatedThrough 之後的觀察不改舊窗口指紋。無 metadata 的既有 checksum 呼叫保持明確全 scope 相容語意，不偷偷推定窗口。

### 查詢索引與容量驗證

先以目前 schema 和 EXPLAIN QUERY PLAN 記錄 query baseline。選擇按 scope／channel／effective instant 以及完整 identity／effective instant 的 bounded seeks；保留 source join 的五欄身分。時間索引表達式須與既有 Date.parse 語意在 canonical source timestamp、receive fallback、時區 offset 和毫秒邊界上一致，由對照測試證明；不得用原始未正規化時間字串比較或秒級截斷取代毫秒排序。

若現有索引不能支持有界查詢，允許新增非唯一、可保留於舊程式的純索引 migration；不更動任何舊 migration、row 值或唯一性契約。條件式新檔為 apps/server/src/db/migrations/052_accounting_evidence_query_indexes.sql；apply 若此編號已被他案使用，先選下一個空號並同步 proposal／design／tasks 的確切路徑。若現有索引已足夠，保留 query-plan 證據並明記不新增 migration。

容量 fixture 固定 requested channels、窗口及最近 baseline，從 10,000 筆擴充至 100,000 筆不相關的同站舊 observation，另加其他 channel／scope 資料。斷言 requested evidence row set 和 materialized row count 不變，single snapshot 的 checksum＋watermark 只做一次 evidence selection，activation 另做一次 fresh selection；year daily request 不新增每日期全 scope query。EXPLAIN 必須呈現 bounded/index-assisted access，而非無界 accepted-reading scan。

同程序以固定 seed、1 次 warm-up＋7 次量測記錄前後 query count、materialized rows、peak heap／RSS 與 median／p95 latency；不在 CI 宣告跨主機毫秒 SLA。row budget、query count 與逐欄等價是硬門檻；性能量測屬對照報告，不等同正式容量驗收。實作時將 fixture seed、重跑命令、環境、原始七次量測、query plans、選取筆數與比較結果存於 openspec/changes/bound-accounting-evidence-window-reads/evidence/accounting-read-capacity.md；七次量測的 p95 只作樣本描述，不推估現場尾端延遲。

## Implementation Contract

- 行為：同 scope／profile／evidence／asOf 下，所有值、quality、issues 順序、boundary／sample IDs、source revisions、offsets、coverage、freshness 與 calculation version 必須與先決修正後的 full-load oracle deep-equal；decimal 保持字串精度。
- 接口：新的 request-local selection 是 server 內部物件；既有 HTTP shapes、shared resolver contracts、accepted-reading schema 值和其他全量 loader 呼叫保持不變。
- 失敗：selector／SQL errors 沿既有 fail-closed／canonical unavailable 邊界回報，不丟棄證據以取得看似成功數值。activation 遇 input 變動仍為 PROJECTION_INPUT_CHANGED，且零次 active-pointer 更新。
- Oracle：tests 使用既有 full-load loader 搭配 shared resolver；不將第二套算法加入 production。fixtures 必須包含 zero、missing baseline、stale baseline、negative/reset、rollover、interval-energy、revision／epoch change、multi-profile periods、received-time estimate、late arrival、future observation、毫秒邊界與同時間 ties。
- 驗收：accountingEvidenceSelection、meterReadingService、periodConsumptionService、consumptionProjectionService focused suites，既有 shared periodConsumption suite，固定容量對照、migration compatibility check、最終 pnpm verify 和 diff review。
- 本案只改 proposal Impact 的 server services／tests、必要時新增純索引 migration，並留下指定容量驗證報告；不改前端、MQTT ingestion policy、retention 或主規格的 unavailable requirement。

## Risks / Trade-offs

- [最舊 opening 導致合法證據閉包較大] → 如實記錄必要 rows，不截斷；bounded 指排除無關歷史，不保證每個 pathological input 固定成本。
- [SQL 時間排序與 JavaScript 不同] → 同時間、offset、毫秒、null source timestamp 的 differential tests 是 merge 前硬門檻。
- [共用快照使 activation 看不到新 evidence] → 交易內明確重讀，測試 late insertion 與零次寫入的 conflict。
- [索引增加寫入與磁碟成本] → 只新增查詢必需的非唯一索引，記錄 ingest fixture 與 DB 檔案大小前後差異，不將本機結果當現場容量承諾。

## Migration Plan

依先決用電 failure change 的最終版本執行。先建立 oracle／query baseline，新增 selector，僅在 query-plan 證據顯示需要時補純索引，逐一接線 period／daily／projection，最後驗證 activation 及完整 gate。索引採 additive migration；回退程式可保留索引，不回滾／刪除 accounting rows。本次只提供提案，不建立實際 migration 或讀取現場資料庫。

## Open Questions

沒有待決產品語意。實際索引 expression／query plan 必須在 apply 以固定 fixtures 證明上述契約；若無法同時達成 row budget 與等價結果，該 task 不得勾選完成或改以無界 fallback 宣稱優化完成。
