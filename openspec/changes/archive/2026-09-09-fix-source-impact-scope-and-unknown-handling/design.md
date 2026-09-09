## Context

動機與實測見 `proposal.md` 及 review D1、D2。基準為 `abd99ba846c25de35100229452e17e2442552a10`。`readSourceImpact` 的 live usage 已按 scope 篩選，但 `parseDraftBindings` 捨棄 scope，之後只比 metricKey；其 catch 又吞掉 JSON 解析失敗，讓外層 unknown 分支無法觸發。直接來源管理與 guided first apply 已共用 `assertDestructiveSourceMutationAllowed`，不必再新增一套 guard。

## Goals / Non-Goals

**Goals:** 修正共用 impact 決策的草稿證據輸入，使兩入口一致、可測試且維持拒絕零寫入。沿用目前回應形狀、409 錯誤碼與 registered expectations 分流。

**Non-Goals:** 不改一般 metric usage 的畫面容錯、不猜裝置實際廠區、不掃描或改寫草稿來「自動修好」資料，不擴大 destructive transition 定義、不新增 profile dependency 或 schema。

## Decisions

### 1. 在 impact 專用解析結果保留 scope

解析後的內部 binding 保留 metricKey、configured scope 與原 consumer 定位；加入 blocking consumers 前才判斷是否符合查詢。明確 CL／KN／global 只匹配相同 scope，`all` 包含全部；`inherit-device` 與既有支援的 omitted scope 保守視為 potential dependency。不把內部 scope 欄位追加到公開 consumer API。

替代方案是沿用只比 key，再請操作者刪除另一廠的引用；這違反 scope isolation。也不以目前登入廠區推算 inherited binding，因為 management read 沒有權威 device context。

### 2. 有效空值與 unreadable 使用不同結果

impact 專用 parser 回傳 discriminated result，或以可識別的解析例外交給現有 unknown 分支，不能再用 `[]` 同時代表 valid-empty 與 parse failure。檢查 supported top-level／regions／dataBindings 表示；合法缺省／空集合維持無依賴，present-but-malformed container 或無法定位目的的 present binding 則 unknown。普通非 binding 設定欄位不做不相關的完整 schema 驗證。

未知結果沿用 `canMutate=false, unknown=true, consumers=[], registeredExpectations=[]`。原始破損內容只供既有受信任診斷使用，不加入公共錯誤回應。對完整 JSON／binding 結構無法判讀時採保守 unknown；不能在不知道 scope 的情況宣稱它屬於另一廠。

### 3. 只修改共同決策，不再分叉兩條寫入路徑

直接 CRUD 與 guided first apply 繼續在各自既有 immediate transaction、任何 source/audit/receipt 寫入前呼叫 shared guard。guided preview 後新增或損壞草稿必須在 apply 看見；不靠 token 的來源快照代替依賴查詢。既有冪等 receipt 重送語意、ownership-only preview 409 分類不變。

### 4. 先建立會失敗的正式回歸

D1 fixture 使用一個只在 KN draft 綁定的 custom metric，確認 CL／KN／all 結果不同；以 unique key 排除 registered expectations 干擾。D2 注入 malformed JSON 並保留原 bytes，核對未知分支與零寫入。另測 valid empty、direct-regions legacy、inherited、invalid container、缺省 scope。HTTP 測試覆蓋 direct disable／rename 與 guided first apply，加入 preview 後證據改變，以及無錯誤時依賴確實能解除。

## Risks / Trade-offs

- [未知草稿暫時阻擋其他來源的破壞性操作] → 這是無法證明安全時的必要保守結果；有效空草稿及可辨識的其他廠區不受此限制，不偷偷刪除使用者資料。
- [過嚴的 parser 把舊版合法表示當損壞] → 先盤點並以既有 fixture 鎖定 supported legacy forms，僅驗 dependency 所需結構。
- [與已修 registered expectation 行為互相覆蓋] → 保留既有測試，明確驗證 structural-only 仍可停用與改名。

## Migration Plan

無資料 migration、API 形狀或部署設定變更。apply 先跑 red regression，再做最小修復與 focused tests，最後跑當下 root `pnpm verify`。回滾只回退本案程式與測試，不回滾或重写使用者來源、草稿或歷史資料。此提案不執行部署、archive 或 commit。
