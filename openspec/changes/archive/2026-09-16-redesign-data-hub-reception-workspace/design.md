# Design: Reception workspace

## Context

Sources 本身保留可直達路由。新手需要看到真實收到什麼，維運者需要快速找到已接入來源；兩者不是同一份集合。U1-R8、M1-R1/R2/R4/R7/R8/R10 已給正確的資料契約，這次把它們變成清晰的操作介面。

## Goals / Non-Goals

清楚區分已配置、觀測候選和生效狀態；保留進階能力但不要求初次操作先知道 topic/metricKey。禁止由無流量推論沒有設備，禁止把 capture 當正式資料入庫。

## Technical Approach

### D1. 兩個視圖，不新增一套全域導覽

```
接收與轉換                         [從接收資料新增] [進階⋯]
管理範圍：KN（沿用工作區）           共享 Broker：目前狀態
[已接入來源] [已接收資料]
範圍摘要／問題數 → 搜尋＋條件 → 對齊欄位列表 → 選取後 inspector
```

既有 bookmark 無 `view` 時仍為 configured；`task=connect` 正規化為 received＋onboarding intent，不再在全量清單上方堆一套獨立流程。零 mappings 時 configured empty state 直接提供接收 CTA。資料中樞頂層 nav 不再新增第三條等價入口。

Configured 列：名稱／廠區／型態／正式值或託管資源摘要／新鮮度／問題與設定狀態。使用情況由可用的 usage/impact 能力批次或按需讀取；無 batch API 前不做 N+1 請求風暴，也不每列永遠顯示假數字。

Received 列：來源名稱或 payload 宣告識別、exact topic、觀測 tag/field 數、最新可用樣本、接收時間、source time 品質、retained／offline 標記、已對應／未對應／部分對應。Topic 是容器，不等於一顆電錶；相同 topic 多 tag 展開為穩定候選。不要預設 topic 名稱就能辨認工廠或設備。

### D2. Profile/capture 控制列

一次明確選 concrete site → current approved connection → 具名 reception profile → 可批准的範圍。多 profile 時不可默選第一筆；只有一個可用 profile 可預選且顯示名稱。多 approved filters 要讓使用者選具名範圍或由受控 server API 返回組合 capture；未實作 union capture 前不得宣稱全部覆蓋。

開始前顯示將接收哪些已批准範圍、期間、上限、只觀察不發佈。開始是顯式操作，不因切分頁或重新整理自動創建 capture。沿用 M1 180 秒預設與明確延長上限；這些是既有規格預設，不是本次量測結果。提供開始／停止／剩餘時間／重新取得樣本，離開/失去授權/期限由 server 收回資源。重複按開始不產生多個失控 session。

### D3. 狀態矩陣

| 條件 | 呈現 | 主動作 |
|---|---|---|
| 未讀取／讀取中 | skeleton，計數為未取得 | 無破壞性動作 |
| 無批准範圍 | 尚未設定可接收範圍 | 有權者設定／無權者說明需管理者 |
| Broker 斷線 | 連線中斷，保留歷次有界證據 | 前往共享連線，保留返回脈絡 |
| 授權拒絕／訂閱拒絕 | 該範圍未獲准 | 重新授權／檢視範圍，不擴大訂閱 |
| 授權後無資料 | 本次時窗尚未收到匹配訊息 | 等待、停止、重試或檢查來源 |
| 部分 filters 成功 | 部分覆蓋＋各範圍結果 | 檢查拒絕項 |
| 僅 retained 舊樣本 | 可供對應、時間品質未知或已知舊 | 選樣本，不標成新鮮讀值 |
| 抓取過期／被淘汰 | 樣本已過期，原草稿保留 | 重新接收或貼上受控例子 |
| 搜尋零結果 | 目前條件沒有匹配 | 清除條件，不能叫使用者重設 Broker |
| 查詢失敗 | 資料未知，不顯示 0 筆 | 重試 |

### D4. URL 與導覽

建議新增 allowlisted `view=configured|received`、`panel=drawer|full`、`section=overview|mapping|samples|usage`，沿用 scope/q/filter/selection/task。source selection 使用 E 的穩定 sourceRef；legacy composite/row selector 經 safe resolver 轉一次或明示找不到。candidate id 綁 capture，不設計成永久書籤。

搜尋 typing/篩選更新用 replace，建議 debounce 250–300 ms，沒有每個字的歷史堆疊。使用者開啟來源或切視圖可 push；瀏覽器 Back 可回清單，而內部關閉只在有同頁來源 history marker 時 back，直接 bookmark 以 replace 清 selection。forward 可還原選取但不得恢復過期樣本。跨 scope 走 E guard；不把 draft 或 payload 放 URL。return context 必須 allowlist route/field identifiers，禁止任意 external return URL。

來源列表保持固定 sourceRef/candidateId key。live value 可更新但不自動移動選取列、scroll anchor 或打斷文字選擇；新的符合結果顯示「有新資料」後由使用者接受排序更新。視圖／scope 變更清理舊 request，晚到的舊 site response 不得灌進新 site。

### D5. 規模與資料新鮮度

已配置清單可先用現有 API＋本地篩選；達測試規模再採分頁／virtualization，不為美化強上大型 grid。Received 必須沿用 M1 的 bounded pagination，前端即使 API 回傳多筆也不得無限堆 DOM/樣本記憶體。stream 若沒有既有支援，使用有界 polling＋取消／backoff／visibility pause；不能在規格聲稱已有 SSE/WebSocket capture stream。

每個計數標明當前廠區、篩選與觀察時間窗；unknown 不轉 0。「最近接收」只能用 receiver evidence；若 API 只提供正式 metric timestamp，就標「資料時間」或新增真實 evidence 欄位，不改名偽裝。

## Architecture Decisions

選雙視圖而非把觀測候選混進既有 mappings 列表；同一 topic 可能有多個 candidate，混成一種 row 容易把觀測誤認為配置。選擇維持 source routes 和 task links，減少重導相容性風險。

## File Changes

修改 Sources、SourceCards、sourceWorkspace、workspaceContext、GuidedOnboardingPanel；新增 ReceivedDataWorkspace、ReceptionScopePicker、CaptureStatusBar、ReceivedCandidateList（名稱提案）。server 若有缺欄位則修改現有 capture/catalog handler，不建立第二套接收服務。

## Risks / Trade-offs

雙視圖增加一個選擇，但換來集合語意正確；以 task intent 自動選適合視圖。候選記憶體上限與保留政策用 server 真值。all/global 可瀏覽授權摘要，但 physical capture/create 必須 CL 或 KN。管理 scope 不等於授權。

## Migration Plan

先建 view resolver 與舊 URL cases，再放 received workspace，最後將主要新增 CTA 轉接 D。在真實 telemetry 未到位前只顯示 unknown，不用預設 Connected 偽裝完成。

## Validation

驗證 0 mappings＋有候選、已有 mappings＋無新觀測、同 topic 多 tag、多 profile、部分 filter 拒絕、capture 過期、CL↔KN 快速切換、Back/Forward、篩選列刪除、retained replay、長列表與未知 usage。證據不含 raw payload 或 credentials。

## Open Questions

跨多 approved filters 的 catalog API 實作能力需 apply 前以最新 code 確認；若不支援合併，用明確單範圍選擇，而不是靜默只用第一個。

## Cross-change contract

路由、四軸狀態、單筆API與重試期限的共用細節見 [STATE-AND-API-CONTRACTS](../../../docs/plans/data-hub-reception-ux/STATE-AND-API-CONTRACTS.md)。A–E的責任／交付順序見 [ROLLOUT-AND-ACCEPTANCE](../../../docs/plans/data-hub-reception-ux/ROLLOUT-AND-ACCEPTANCE.md)。

## 2026-09-15 跨發布端審查更新

本輪基準為 `fd405ebc2957232b6c622071622b9c7d830a3a42`。本 change 仍是未實作提案，不勾選產品驗收、不歸檔。與本輪新增的 `plan-power-mqtt-publishing-and-kn-onboarding` 共用 [MQTT-OWNERSHIP](../../../docs/plans/data-hub-reception-ux/MQTT-OWNERSHIP.md) 與 [PUBLISH-TAG-REGISTER](../../../docs/plans/data-hub-reception-ux/PUBLISH-TAG-REGISTER.md)。

### 更新決策與邊界

接收資料必須區分 Solar 託管、電力原始點、電力計算結果與診斷訊息；批准範圍須對應 Solar／OPC 實際 namespace，不沿用 factory/ 範圍假稱涵蓋所有資料。

本輪具體實作責任與驗收由 DHR-R5、DHR-R6 約束；不得把新增發布契約當作現行 API 已支援，也不將隔離 fixture 當現場測試。

## 2026-09-16 工程別修訂（取代舊 KN 逐錶前提）

固定八工程列表與已觀測集合分開；KN使用批准的factory/guanyin工程topic，不要求搬opc/raw。沒有逐錶資料不阻擋工程成果；未到件保持缺件。

觀音結果契約由 [`add-kn-engineering-mqtt-sources`](../add-kn-engineering-mqtt-sources/proposal.md) 的 KNE/EPR 要求負責；本文件舊段落中的 DDE/physical/raw 與 F v1 前置僅適用明確選擇的物理來源，不得套成工程別必要條件。A 的焦點、B 的路由、C 的連線責任、D 的預覽及 E 的配置安全依原規格保留。需要逐來源核對的是工程成果模式與涵蓋範圍，不是上游每顆錶。
