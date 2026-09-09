## Context

動機與實測基準見 `proposal.md`。固定基準為 `26c5598e590c05d993833b3b890149657ede13ab` 加上 `fix-guided-source-mutation-guards` 的修補。

`sourceImpactService.ts` 的來源影響讀取把三個查詢結果合併成單一 consumer 陣列：metric usage 的回傳、draft stage 設定解析出的綁定，以及 derived metric 輸入。其中 metric usage 的回傳本身混了兩種列：published live 頁面的 widget 綁定（來自資料庫），以及由 playback 顯示綁定表與顯示指標需求表展開的 registered 列（純程式碼，不讀資料庫）。

合併後只要陣列非空就 `canMutate` 為 false。registered 列恆存在於 30 個 metricKey，因此這些目的地的破壞性來源操作恆被拒絕，且沒有任何操作能讓它變為可行。

metric usage 的每一列已帶 consumer 類型欄位，值為 widget、story 或 readiness；widget 即 published live 頁面綁定。區分所需的資訊已經存在，本案不需要新的分類來源。

## Goals / Non-Goals

**Goals:** 讓阻擋只發生在操作者能解除的引用上；結構性指標期望仍被揭露而不阻擋；兩個來源寫入入口的判斷維持共用且一致。

**Non-Goals:** 不重做相依圖或跨站引用辨識；不新增覆寫、確認或豁免參數；不改 playback 頁面的指標註冊模型；不放寬影響查詢失敗的 fail-closed 行為；不改前端訊息呈現；不調整 preview 的狀態分類。

## Decisions

### 1. 以既有 consumer 類型區分阻擋集合，不新增分類來源

阻擋集合定義為：draft stage 綁定、metric usage 中類型為 widget 的列、derived metric 輸入。其餘 metric usage 列（story、readiness）為結構性期望。

不選擇「在來源影響服務裡重新推導哪些頁面真的在播放」，因為 metric usage 已經負責這件事，重推會產生第二套可能分歧的答案。也不選擇在共用 guard 裡分流，因為 guard 的職責是決定破壞性轉換是否放行，判斷依據應該由影響讀取提供。

### 2. 結構性期望以獨立欄位揭露，不混入阻擋集合

來源影響的回傳新增一個結構性期望欄位，成員直接由 metric usage 的列對應，不新增衍生欄位。既有的 `canMutate`、`unknown`、`consumers` 欄位名稱與型別保持不變；`consumers` 只裝阻擋集合。

不選擇把結構性期望留在 `consumers` 並另加旗標，因為現有讀取端在 `canMutate` 為 false 時會直接把 `consumers` 當成「阻擋原因」列出，混裝會讓非阻擋項目被當成阻擋原因顯示。

### 3. 破壞性轉換的判斷位置與錯誤契約不變

共用 guard 的觸發條件、查詢對象（已保存來源的 scope 與 key）、交易內位置、`E1_SOURCE_IN_USE` 與 `E1_SOURCE_IMPACT_UNKNOWN` 兩個錯誤碼及其 HTTP 409 皆不變。本案只改變「什麼算阻擋」，不改變「怎麼阻擋」。

影響查詢失敗仍回 unknown 並拒絕；結構性期望不參與這個判斷，查詢失敗時也不因為它存在而改變結果。

## Implementation Contract

**行為：** 對一個目的地執行破壞性來源操作時，只有 draft 綁定、published live 頁面的 widget 綁定或 derived metric 輸入會使操作被拒絕。若該目的地只有結構性指標期望，破壞性操作可以完成；期望本身仍出現在來源影響讀取的回應中。此行為同時適用於導引式套用與直接來源管理兩個入口。

**資料形狀：** 來源影響讀取回應保留 `canMutate`（boolean）、`unknown`（boolean）、`consumers`（陣列）三個欄位與型別。`consumers` 僅含阻擋集合，成員維持既有的 draft、live、derived 三種 kind，其中 live 僅來自 widget 綁定。新增一個結構性期望陣列欄位，每個成員帶 metric key、consumer 類型（story 或 readiness）與其頁面識別。空集合以空陣列表示，不用 null。

**失敗模式：** 影響查詢失敗時 `unknown` 為 true、`canMutate` 為 false，阻擋集合與結構性期望皆為空陣列；破壞性操作回 HTTP 409 `E1_SOURCE_IMPACT_UNKNOWN`。有阻擋項目時回 HTTP 409 `E1_SOURCE_IN_USE`。只有結構性期望時不產生錯誤。

**驗收條件：**
- 新增回歸證明：目的地只有結構性期望時，導引式套用與直接來源路由的停用與 metricKey 變更皆成功，且來源與 mapping 的啟用狀態一致。
- 新增回歸證明：同一目的地加上 draft 綁定後兩個入口皆回 409 `E1_SOURCE_IN_USE`；加上 published live 頁面 widget 綁定或 derived metric 輸入亦同。
- 新增回歸證明：來源影響讀取在只有結構性期望時 `canMutate` 為 true，且結構性期望欄位仍列出該期望。
- `fix-guided-source-mutation-guards` 建立的相依測試除了必要的 fixture 目的地調整外全部維持通過，錯誤碼與零寫入斷言不放寬。
- 交付 gate 為當下的 `pnpm verify`。

**範圍界線：** 在範圍內：來源影響服務的 consumer 分類、來源影響讀取端點的回應欄位、上述回歸測試。在範圍外：metric usage 服務本身的列產生邏輯、前端訊息呈現、playback 註冊模型、資料表結構、共用 guard 的觸發條件與錯誤碼。

## Risks / Trade-offs

[操作者可能停用某個 playback 頁面預設卡片仍需要的指標來源] → 這是刻意的取捨：該後果由既有的顯示就緒檢查與 fallback 政策呈現，而不是用一個無法解除的永久禁止來預防。結構性期望仍在回應中揭露，操作者不是在無資訊下決定。

[widget 判定依賴 metric usage 對「已發布且在播放設定內」的既有定義] → 本案沿用該定義而不另行推導；若該定義本身有缺口，屬於 metric usage 的問題，應獨立提出而不在此擴張。

[既有測試 fixture 曾為了避開恆真阻擋而改用無 consumer 的目的地] → 本案放寬後那些 fixture 不再必要，但調整它們不是必要工作；只在測試因此失敗時才動，並在驗證紀錄說明。

## Migration Plan

不需要 schema migration 或資料回填。實作順序為先加入會失敗的回歸，再收斂分類，最後重跑相依 service 與 route 測試及當下 `pnpm verify`。既有被此限制擋下而未完成的來源操作不會被自動補做。本案僅建立計畫；不部署、不 archive、不 commit。若需回復，只回復該次分類修補，不動來源或頁面資料。
