## Context

動機與證據見 proposal.md、review report R1。Draft 分支已修復 explicit/inherited scope，但 derived 分支仍直接 `WHERE metric_key = ?`；schema 已保存 `scope_selector` 及 owning definition 的 `output_scope_policy`、`site_scopes_json`。Registry 的 `resolveMetricInputScopes` / `outputScopes` 已定義 explicit 與 output-site 的不同語意。Source mutation guard 已由 direct 與 guided 共用，不需另設 route 層判定。

## Goals / Non-Goals

**Goals:** 讓相依判定使用與求值一致的有效輸入 scope，保留目前原子拒絕與相同 scope 保護，並讓壞證據維持 unknown。

**Non-Goals:** 不編譯或執行整個公式 registry 來查影響，不加入快取，不重新分類 disabled definitions，不改 API consumer shape，不把此次修復延伸成一般 dependency graph 重構。

## Decisions

### 1. 先按 key 讀候選，再解讀有效 scope

讀取 matching `derived_metric_inputs` 並連同 owning definition 所需欄位。使用可辨識 missing owner 的查詢，而不是讓 INNER JOIN 把異常 evidence 默默刪掉。僅驗證這次候選所需的 scope 證據；不讓其他完全無關 key 的壞公式阻擋全系統。

明確 selector 直接對照輸入 scope；`output-site` 必須屬 site output 並採有效 siteScopes，省略時兩廠皆有。不能以 definition 的輸出 scope 取代 explicit input scope：CL 的輸出公式仍可能明確引用 KN 或 global。

不採用「把 SQL 加上 `scope_selector = requestedScope`」的局部補丁，因為那會漏掉 output-site 真正相依。

### 2. scope 展開只有一份語意

將 registry 現有純 scope 展開責任整理成可被 impact 與 registry 使用的狹小純 helper；優先放在既有 shared derived-metric 模組，並由原 registry 呼叫它。這不是新增公式 evaluator。持久化原始 JSON 的有效性檢查仍在 server 邊界，不能先把壞 JSON 正規化成空陣列再當成安全。

若實作選用既有可重用 export，維持相同測試契約即可；不為了抽象化搬動其餘 registry 邏輯。

### 3. 保留 guard 與寫入時序

修改 `readSourceImpact` 的 derived 分支，不在 direct/guided route 複製 if/else。相同 scope 仍進 consumers；不相干 explicit scope 排除；registeredExpectations 保持原 shape。沿用既有未知影響 envelope、`E1_SOURCE_IMPACT_UNKNOWN`、`E1_SOURCE_IN_USE` 與 transaction 內 guard。

不根據某個當下 enabled evaluator snapshot 忽略 disabled definition 的 configured input；本案只修 scope，不偷偷修改相依生命週期政策。也不動 identical committed request replay。

### 4. 回歸驗證以正式可保存的定義為前提

先由 registry save 建立 `custom.*` namespace 的合法測試公式，避免用不可透過管理 API 保存的 fixture 宣稱產品缺陷。覆蓋 explicit CL/KN/global、output-site 單廠/雙廠/省略、all、同 key 不同 scope、disabled definition、壞 scope 證據。Direct 與 guided 使用真 routes、隔離 DB 與受控 runtime；拒絕時比較 source/mapping/audit/receipt 及 runtime 呼叫前後快照。特別測 preview 後新增或改 scope 的相依。

## Risks / Trade-offs

- [排除太多而放行真正相依] → 正反成對測試，output-site 依 siteScopes 展開，不以名稱或輸出位置推測。
- [壞 siteScopes 被當成空集合] → server 邊界保留 raw evidence，解析失敗維持 unknown；不修寫原資料。
- [共享 helper 影響公式求值] → 執行 existing derived registry / shared tests，保持原 scope 展開結果與 public types 相容。
- [同一 definition 多 alias] → 本案不更動 consumer 列表的既有去重與排序政策；驗證存在性與 blocking decision，不借機改 response shape。

## Migration Plan

不需 schema migration 或 data backfill。完成 red→green tests、雙軸 review、strict OpenSpec validation 與 `pnpm verify` 後，另依正常流程決定 apply closeout/archive；本次尚未實作。回退可只回退程式變更，不需回退正式資料，但會重新出現跨廠誤擋。
