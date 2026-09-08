# Design｜四步廠區用電設定與日常任務捷徑

## Context

使用者指出根本問題是「在哪裡指定每廠區分子/分母，如何不用讀手冊就完成」。本change不是新增一篇說明書，而是為每個決策指定畫面、欄位、預設、回饋、資料契約與完成條件。

## Goals / Non-Goals

**In scope**：一個共同設定表面；四個正常設定畫面；已設定後的直接編輯；source缺少時的inline onboarding；展示編輯的常見任務入口；不熟悉系統的操作員驗收。

**Out of scope**：自動猜測物理主/子錶、只有一次讀值卻補出年初歷史、四下點擊承諾、任意拖拉設計工具、用操作手冊當交付替代品。

## Dependencies

E6 / add-site-energy-accounting-profiles、E3 / repair-consumption-history-projections、E4 / fix-overview-monthly-consumption、E5 / fix-department-energy-shares、U1 / refactor-data-hub-task-workspace、U2 / add-guided-data-source-onboarding、U3 / refactor-display-editor-workspace、U4 / add-unsaved-binding-preview。

UI可先依契約設計；正式任務成功需上述生產路徑存在。數值與membership由E6/E3/E5權威驗證，不在前端另建公式。

## Entry and Information Architecture

Canonical proposed route：`/settings/data-hub/energy?scope=kn`，中文入口「資料中心 → 廠區用電設定」。`scope=cl`完全獨立；all進唯讀總覽再選廠區。各廠區設定不能依播放頁是否enabled而隱藏。

CircuitSettings提供「用電來源與占比」。展示編輯器選到用電卡片提供「修改用電來源與占比」。兩者打開同一可嵌入的SiteEnergySetup表面，帶scope、departmentId與opaque returnContext；未保存page draft留在原workspace。URL不存敏感payload或完整設定草稿。

## Screen Contract

### 1／4 選廠區

中壢廠／觀音廠卡片，各顯示「尚未設定／已設定／等待資料」與來源摘要。沒有CL無聲預設；從KN入口進來鎖定KN上下文並可省略此步。下一步問具體要統計的來源，不要求使用者了解scope、page key。

### 2／4 選總用電來源

主問題：「這個廠區的總用電，要看哪顆電錶？」選擇相容清冊中的一枚錶；「有多個總進線」展開多選（非重疊需review）。顯示中文名/廠區/累積kWh/最後回報。說明：「日、月、年用量會依期間自動相減，不用設定三次」。

選「目前沒有全廠總錶」可繼續設定已納管部門占比；首頁全廠用量不冒用部門合計補上。若來源未接入，「在這裡接入電錶」由U2 inline處理；四步預算僅適用已具備來源，不把新接線/帳密/確認計量語意藏在第0步。

### 3／4 配對部門與比較基準

表格：部門名稱｜使用電錶（多選）｜同期間已知用量／等待原因。新增部門只填名稱、選電錶；已有部門沿用穩定ID。以下接一個問題：「各部門占比，要和哪個總量比較？」

一般選項：
- 「整廠總用電（沿用上一步）」：有已reviewed siteTotal才可選；推薦選項不是未經確認的預設送出。
- 「這些部門的用電合計」：明確列membership並自動改標題為「已納管部門占比」。

進階：「指定另一組電錶／統計範圍」：選meter-set，輸入正確範圍名稱，檢查所列部門位於同邊界。不是自由公式框。同一分布群組的所有部門共用分母；不在每張卡片放獨立分母造成無法比較。

### 4／4 確認結果並套用

顯示：「觀音廠總用電來源：總錶A」「沖壓部：部門錶1＋2」「比較基準：整廠總用電」。day/month/year切換只改preview period。合成示例：分母1000kWh，沖壓200→20%，塗裝300→30%；旁邊可展開相同時間窗口的原始起迄讀值。

顯示來源是否完整、哪些畫面已跟隨這份profile、哪些custom bindings不自動改、往後生效及必要的歷史partial狀態。每一列可「修改」直回欄位，回來保留其他答案。主按鈕：「套用觀音用電設定」。結束頁說明已儲存哪個revision、還等哪些讀值，不聲稱播放器已套用；「返回原畫面」保留選取與縮放。

## Repeat Tasks

首次成功後顯示一張廠區摘要：「總用電來源 [修改]」「部門電錶 [修改]」「占比比較基準 [修改]」。日常改一項只開focused form＋review/apply，不回到step1。跨廠區複用只複製部門名稱/排列，不複製meter IDs。

Editor只顯示選取物件能做的任務：更換圖片、修改文字、更換資料、調整顯示、檢查發布。資料指到profile；外觀/顯示period仍經page draft/publish。從卡片改共用profile前，review明說影響所有profile consumers，不假裝等頁面發布才生效。

## UI State and Safety

草稿、唯讀預覽、active profile三者分開。上一步、改來源、切drawer與斷線均保留輸入。錯誤如「這顆錶已用在沖壓部，不能再加進塗裝部」「尚未收到月初讀值，這個月暫時無法完整計算」直接帶回有問題欄位。不能僅顯示代碼。

legacy來源needs-review可inline確認meter kind/unit/identity，不能先要求刪掉再重建。只有data不足仍能保存有效設定並等待；結構不合法不得apply。新增來源獨立保存的副作用在U2確認，不把取消parent說成刪除了source。

## Migration and Rollout

先交E6設定與shared picker，再接入四步主線和原route/卡片捷徑。保留舊連結和管理權限；舊CircuitSettings只保留電力/外觀門檻等原功能，不再建立第二套能源membership。啟用前用CL/KN測完整旅程；回退新入口不刪profile或source samples。

## Verification Strategy

標準路徑預備有效來源、不讀手冊、4個logical screens以内（site已知可3）、不跳其他設定頁、不輸入公式/topic/path/metric ID。不是四click保證。最少3名不熟悉系統的代表性操作員各測initial setup、only-denominator edit與duplicate recovery；數字和樣本數是本提案验收門檻，不是已測結果或統計優越證明。關鍵任務失敗必須修再測，不能補教學後宣稱初次使用通過。

## Design References

GOV.UK question pages（https://design-system.service.gov.uk/patterns/question-pages/）支持明確問題與可返回的狀態；check answers（https://design-system.service.gov.uk/patterns/check-answers/）支持送出前摘要與直接修改；error message（https://design-system.service.gov.uk/components/error-message/）支持指出問題與修正方式。這些是介面設計依據，不是Solar Player已驗證的可用性結果。

## V3 MQTT Source Integration

新增U6-R11：以M1/M2補齊來源探索→穩定tag選擇→批次preview/apply。此change維持原有單一權責，UI不再要求先到外部client查訂閱/publish後手抄Topic。M1/M2為新的前置/整合契約，不代表功能已在main。
