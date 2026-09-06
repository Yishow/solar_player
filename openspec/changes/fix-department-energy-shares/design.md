# Design｜用同期間真實電量計算部門用電百分比

## Context

FactoryCircuit/viewModel 的 slotDefinitions 提供固定25/20/15/15/10/5/5/5，healthy story path 與 fallback path 都把 slot.sharePercent 直接當 sharePercent。卡片目前另有 livePowerKw/utilizationPercent，兩者不是期間用電占比。

## Goals / Non-Goals

**In scope**：在服務端計算同廠區、同期間、同量測種類的部門電量及分母；透過 story contract 傳給前端。預設展示今日用電占比，允許在 editor 選月/年；既有即時kW欄位保持功率語意。

**Out of scope**：不推估沒有子錶的部門、不自動把所有部門加總當全廠、不強制讓資料不足時仍加到100%，不把 ratedCapacity利用率當部門用電占比。

## Dependencies

E1 / add-meter-reading-contracts、E2 / fix-period-consumption-deltas、E3 / repair-consumption-history-projections、E6 / add-site-energy-accounting-profiles

所有新介面都必須在 shared 型別、server 驗證、呼叫端與測試之間一致。未知現場單位、採樣頻率與既有來源身分不可靠名稱猜測。

## Decisions

### D1. 預設口徑

本提案預設period=day（今日）、unit=kWh；月/年由 editor改 period並寫入草稿/正式配置。顯示「今日用電占比」等明確名稱。需要瞬時負載占比時另有power-share模式且分子分母均kW，不能無聲 fallback。

### D2. 主錶分母

有指定 reviewed site-main meter 時，分母是同一期間的主錶用電差值；部門分子是非重疊子錶組的差值。主錶有配置但缺資料時，不偷偷改用部門合計分母。

### D3. 部門合計分母

沒有全廠主錶時，允許操作員明確選 department-sum，標「已納管部門用電占比」，不是「全廠占比」。分母membership independent of畫面顯示/隱藏，避免隱藏卡片就改變其他部門百分比。

### D4. 一致窗口

所有 contributing meters 必須使用同 scope/period window/asOf policy/algorithmVersion；邊界估算須在E2允許偏移內並揭露estimated。不能拿A到10:00和B到昨天當作同一完整窗口。

### D5. 缺資料和0

分母正且部門已知0 -> 0%；分母0 -> —並顯示總用電為0；缺分子 -> 該部門—；department-sum 缺任何必需部門 -> 整組—/partial，不重正規化剩餘部門。主錶分母可用但某部門缺值時，其他已知部門可顯示並标 partial coverage，不宣稱完整100%。

### D6. 重疊與剩餘

同一 meter/channel不能同時納入两个部門；父/子錶不可在同一加總集合重複計算，父錶當分母、子錶當分子則合法。主錶減已知子錶可產生「其他／未分攤」，但缺子錶時標「含未回報」，不可宣稱能耗損失。子錶合計>主錶超過所設儀表誤差時顯示資料口徑衝突，不截成100%。

### D7. 舍入與初始遷移

服務端輸出未舍入ratio，前端預設1位小數；部門合計模式允許一般舍入差（以實際部門數×0.05百分點界限），不偷偷修改數字湊100。舊seed固定比例不作正式fallback；尚未配置能源channel時提供可定位的設定提示。

### D8. 數值欄位不要借殼

shared story新增period energy及nullable share欄位；不能把consumptionKwh寫进livePowerKw。load row的可用性依所選basis決定，不再把有能源但沒有功率的部門整列判成缺資料。既有kW主欄位若無power source保持—，energy share仍可獨立呈現。power-share只保留明確語意相容設計，本次不另開發新的瞬時比例功能。

## API / Data / State Contracts

DepartmentShareResult:{metricScope,periodStart,periodEnd,periodKind,basis(energy/power),denominatorKind(site-main/department-sum/meter-set),denominatorLabel,profileRevision,denominatorValue,unit,quality,coverage,members:[departmentId,meterIds,consumptionKwh,sharePercent|null,issues],unallocatedKwh,revision}。UI sharePercent 為nullable，不再由slotDefinitions提供。

錯誤回應保留既有管理／播放權限邊界；新增錯誤提供穩定 code、可理解訊息與可定位的欄位或 item。缺資料用 null＋品質，不以空字串、NaN 或 0 掩蓋。未識別的 scope、meter、page 或 item 不自動改成 CL。

## Migration and Rollout

先建立以250/150/100與500為例的server fixtures，再擴shared story，最後移除前端固定比例。升級時未經確認的來源保持unavailable，不能為維持舊畫面而塞假比例。回退保留來源mapping，若停用新服務就顯示—而非舊靜態百分比。

改動採 additive 相容策略；migration 編號與既有型別細節於 apply 對照最新 main，不能依文件預占流水號。任何重算須以副本 dry-run 和差異報告先驗證，正式資料套用另行授權。

## Risks / Trade-offs

部門範圍、主錶與子錶是否涵蓋相同邊界需要現場確認。本提案v2提供site-main、department-sum及named meter-set三種比較基準與明確標籤，避免替使用者猜「全廠」定義；首輪apply必须完成meter membership盤點。

## Verification Strategy

同目錄 test-plan 是 requirement-to-scenario 驗證對照；具體觀測條件以 specs 的 WHEN / THEN 為準。先寫失敗測試，再實作，再跑 regression。不得只修改 test expectation 讓既有錯誤數字通過。

## Source of Progress and Closeout

只有同目錄 tasks.md 的 checkbox 表示本 change 的實作進度。本包全部未勾選；格式檢查或公式 fixture 通過不代表應用程式測試通過。待實作後保存實際命令輸出、review findings 與必要 FHD witness；使用者驗收及 archive/commit 規則依 repo現行 workflow。

## V2 Site-Setup Contract

The share service SHALL consume E6 profile numerator and denominator membership. The editor SHALL store presentation period/style and a stable profile/department reference, not a second independent denominator. A meter-set comparison SHALL preserve its named boundary and never be relabeled as whole-site. Source editing SHALL enter U6 in context.

規劃中的來源定義唯一放在E6 profile；操作入口由U6承接。詳見 `add-site-energy-accounting-profiles` 與 `add-guided-site-energy-setup` change。新增需求：E5-R8。
