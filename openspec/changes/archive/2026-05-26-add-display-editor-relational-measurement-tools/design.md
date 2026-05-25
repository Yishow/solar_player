## Context

foundation overlay change 之後，editor 將具備 design-space mapping、selected-only / full-canvas 模式與全畫 guide；但 operator 仍缺少 region-to-region 的關係量測。實際排版時，常見問題不是「這個 box 多寬」，而是「這個 hero block 與右邊 media 差幾 px」、「這兩張 KPI card 上下是否等距」、「我能不能直接拖量尺把間距調成目標值」。

這些能力都應該建立在既有 canvas interaction contract 上，而不是再做一層脫離 editor selection 的獨立視覺玩具。量尺若只是顯示數字卻不能反向調整幾何，operator 仍然要在量測與輸入框之間來回切換，價值有限。

## Goals / Non-Goals

**Goals:**

- 提供任意兩個 region 之間的自動量尺，涵蓋水平、垂直與最近邊界關係。
- 提供不打斷既有選取流程的暫時量測模式。
- 讓量測線或量測把手可以直接反寫 selected region 的位置或尺寸參數。
- 確保量測標籤在密集畫面下仍保持可讀，不被內容或其他標籤完全遮住。

**Non-Goals:**

- 不處理 snap、distance lock、multi-select align/distribute；這些交給 alignment toolkit。
- 不把任意兩個 region 的關係永久保存為版面 constraint。
- 不重做 overlay preset、design-space mapping 或 region tree。

## Decisions

### Resolve relational measurements from editor-known geometry only

決策：任意兩個 region 的量尺只使用 editor 已知 geometry 與 constraint 資訊計算，不依賴 DOM 真實渲染邊界或文字內容的像素檢測。

理由：design-space 已經是 editor 的真實幾何來源。若量尺改去讀 DOM box，會受到縮放、字型與 runtime rendering 細節干擾，反而破壞「量測就是設計尺寸」的前提。

替代方案：讀取實際 DOM client rect 後再回推量測。拒絕原因：容易因 zoom/pan 與內容排版差異造成量測抖動。

### Model temporary measure mode separately from primary selection

決策：暫時量測模式不改寫 primary selection，而是允許 operator 以修飾鍵或明確的量測入口，指定 measurement source 與 measurement target。量測結束後，primary selection 保持不變。

理由：使用者已明確要求不要讓所有視覺輔助都打亂目前操作語意。量測若每次都搶走 selection，反而使 editor 更混亂。

替代方案：每次量測都切換到第二個 region 當 selected target。拒絕原因：會讓 inspector 與 active geometry 在量測過程中不停跳動。

### Make measurement handles mutate only the selected region

決策：拖動量測線或量測把手時，只允許 selected region 的幾何被反寫；另一端 reference region 維持固定。若目前沒有 selected region，量測線可以顯示但不可拖動調參。

理由：這能保證「哪個物件會被改」永遠明確，避免雙邊一起動的不可預期結果。

替代方案：根據拖動方向自動判斷要改哪一側 region。拒絕原因：對 operator 來說太隱晦，也較難驗證。

### Avoid label occlusion with priority and fallback placement

決策：量測標籤需要有優先級與候選位置。優先顯示 selected region 相關量測，其次才是暫時量測；若主要位置被遮住，標籤改放到備援位置，必要時可縮成簡化樣式，但不得完全消失。

理由：密集編輯畫面最常見的失敗就是資訊都在，但互相遮住看不到。先定義優先級與 fallback placement，比單純調透明度更可靠。

替代方案：標籤重疊時全部照舊硬疊。拒絕原因：資訊存在但不可讀，等於沒做。

## Implementation Contract

**Behavior**

- operator SHALL 可以在 editor 中量測任意兩個具有 geometry 的 region 之間的距離。
- 暫時量測模式 SHALL 允許 operator 檢視關係量測，而不改變 primary selected region。
- 當 selected region 存在且量測線提供可拖動把手時，拖動該把手 SHALL 更新 selected region 的 design-space geometry。
- 若 selected region 不存在，關係量測可以顯示，但 SHALL NOT 啟用會改動幾何的拖動把手。
- 當量測標籤與內容或其他標籤衝突時，editor SHALL 改用備援位置或簡化樣式，而不是直接讓標籤完全消失。

**Interface / data shape**

- relational measurement state 需要能表達 source region、target region、量測軸向、距離值、候選標籤位置、目前是否可拖動調參。
- canvas workflow 需要能區分 primary selection interaction 與 temporary measure interaction。
- measurement handle drag 結果需要明確回傳對 selected region 幾何的更新意圖，而不是直接改 DOM。

**Failure modes**

- 任一量測端點缺少 geometry 時，editor SHALL 放棄該筆關係量測，但不得中斷其他 overlay 與編輯能力。
- 若候選標籤位置全部受阻，editor SHALL 退回簡化標籤樣式，而不是讓畫面留下不可解讀的重疊數字。
- 若 reference region 在量測過程中消失或切頁，該筆暫時量測 SHALL 自動結束。

**Acceptance criteria**

- Web 測試需要覆蓋任意兩 region 自動量尺、暫時量測不改 selection、拖動量測把手反寫 selected geometry、無 selected region 時把手不可用、標籤避讓 fallback 等場景。
- interaction helper 測試需要覆蓋量尺距離計算與拖動量尺更新幾何的數值案例。
- `spectra analyze add-display-editor-relational-measurement-tools --json` 與 `spectra validate add-display-editor-relational-measurement-tools` 必須可通過。

**Scope boundaries**

- In scope: region-to-region rulers、temporary measure mode、measurement handle drag-to-adjust、label occlusion avoidance、測試更新。
- Out of scope: snap/distribute、persistent layout constraints、runtime payload changes。

## Risks / Trade-offs

- [Risk] 任意兩個 region 量測會讓 overlay 過度擁擠。 → Mitigation: temporary measure mode 與 selected-related priority 限制同時出現的關係量測數量。
- [Risk] 拖動量尺直接改幾何可能讓 operator 分不清誰會被改。 → Mitigation: 只允許 selected region 被反寫，並在把手上維持清楚的 selected affordance。
- [Risk] 標籤避讓規則過度複雜會增加維護成本。 → Mitigation: 採固定候選位置與優先級，不引入全域最佳化排版器。
