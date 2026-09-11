## Context

selectCalculationEvidence 目前為全部歷史 identities 取得開頭 anchor，再以最早 anchor 查整段 channel。退役 identity 的 1 月 anchor 使 9 月計算讀入 10,000 筆不影響結果的 2 月歷史。需要縮小 materialization，同時維持 shared resolver 的完整結果與 diagnostics。

## Goals / Non-Goals

**Goals:**

- 與 requested closing 無關的退役 identity 不再把 calculation lower bound 拉回無關歷史。
- bounded selection 與 full-load oracle 在支援的週期、身份轉換與證據診斷上完全一致。

**Non-Goals:**

- 不改 shared resolver 的計算、資料庫 schema/index、歷史資料或 projection fingerprint 選取。
- 不用固定天數、SQL LIMIT 或只取目前設定 meter identity 來截斷證據；不宣稱 production capacity 驗收。

## Decisions

### Closing identities 決定開頭 anchors

eligible 指 accepted row 的 calculationInstantMs 可計算：source_timestamp 存在，或 timestamp_quality 為 receive-time-estimated 時使用 received_at；identity 是同一 scope/channel 下的 meterId/sourceRevision/epochId 三元組，「retired」只是 fixture 描述，不新增欄位或依目前啟用設定判斷。先收集 calculation instant 落在 [fromMs, throughMs] 的 identities；逐 channel 以 findLatestAcceptedInstantMs 的 calculationEligible=true 查 fromMs 之前的最大 instant，再以精確 [instant, instant] window 讀取並保留全部 eligible identity ties，聯集為 opening-anchor 查詢候選。只有這些可能參與 requested closing 的 identities 才需要向前查詢 opening anchors。multi-date 請求以完整 requested span 覆蓋各日期，避免只看最後一天；無窗口內讀值仍保留 full-load 使用的 pre-span closing/freshness 證據。沿用 indexed lookup，必要時在 meterReadingService 補同層讀取 helper，不新增 schema。

### 保留完整 continuity closure

取得相關開頭 anchors 後，保留該計算閉包中全部 intervening observations，包括不同 meter、revision、epoch 及同時刻 ties。不得只按相關 identity 過濾區間中的資料，否則會漏掉 reset/replacement 診斷。interval-energy 保留原本窗口重疊及時間估計語意，不被 cumulative anchor 收斂誤刪。projection fingerprint 繼續使用自己的既有選取入口。

### 固定 fixture 與 full-load 差異驗證

固定同一 9 月窗口與相關證據，分別加入 10,000、100,000 筆 2 月無關歷史；bounded materialized row identities/counts 必須不增，結果與 full-load deeply equal。採固定 evidence closure 的比較，避免用 wall-clock 速度或只看 valueKwh 掩蓋回歸。檢查查詢計畫延用既有索引，沒有轉成 channel 全歷史 materialization。

## Implementation Contract

- In scope：apps/server/src/services/accountingEvidenceSelection.ts、apps/server/src/services/meterReadingService.ts 的計算證據讀取及各自 test；apps/server/src/services/periodConsumptionService.test.ts 的端到端差異驗證。
- Interface：保留 selectCalculationEvidence 的輸入與結果 shape、materializedRowCount/fullLoad diagnostics，以及 transaction/as-of 邊界；新 lookup 僅為同層內部 helper。
- Behavior：retired identity 的老 anchor 不影響已固定的 requested closing/opening/continuity evidence，就不得擴大回傳集合。有效老 baseline 與兩端之間的必要觀測仍能使集合擴大。
- Failure：空 channel、無窗口內 closing、過期 baseline、replacement、revision、epoch、reset、late arrival、receive-time-estimated 與同時刻歧義，沿用 full-load resolver 的 unavailable/freshness/continuity 結果，不以缺資料補零。
- Acceptance：selector tests 斷言穩定 row identities/counts；meterReadingService tests 驗證 indexed helper 的 ties 與時間邊界；periodConsumptionService tests 比對 day/month/year/week/total、多日期及 interval-energy 的完整結果。10,000 與 100,000 增量 fixture 均須通過，fingerprint invalidation 既有 regressions 不變。
- Out of scope：projection persist/rebuild、shared math、資料遷移、全服務 performance framework、正式容量宣告。

## Risks / Trade-offs

- [過度收斂會刪掉中途身份變更] → anchors 決定起點後，讀取 closure 內所有 identities，並以 full-load diagnostics 比對。
- [無窗口內資料或同時刻多 identity 被遺漏] → 明確驗證最新 eligible fallback 與全部 equal-instant ties。
- [fixture 只證明數值一致] → 比較完整輸出與選中 row identities/counts，不修改 oracle 來遷就實作。
