## Context

目前管理頁的 shell 結構與播放頁不同：播放頁使用 DisplayCanvas，把 header、content、footer 一起放進固定 1920x1080 畫布後再整體縮放；管理頁則由 ManagementShellFrame 承接未縮放的 header/footer，再把部分 route 的內容放進 ManagementFixedLayoutFrame。這讓 AppHeader 在兩個 surface 中雖然使用相同元件，卻呈現不同的感知尺寸。

這次 change 的約束有三個：
1. 需求已確認要以全站一致的 visual consistency 為優先，而不是保留一般管理頁目前較大的可讀性。
2. 全部 management routes 都要收斂到同一種 shell contract，不再維持 fixed-fhd 與非 fixed-fhd 的分流。
3. DisplayPagesEditor 的 hideChrome 行為與既有 shell witness tests 已存在，新的設計不能把這些邊界情況遺漏掉。

## Goals / Non-Goals

**Goals:**

- 讓全部 management routes 使用和播放頁對齊的 whole-page canvas 縮放模型。
- 讓管理頁 header、content、footer 在同一張 1920x1080 畫布內排版與縮放。
- 明確定義管理 shell 的 slot 尺寸、縮放規則、hideChrome 行為與 route metadata 遷移。
- 用結構測試與瀏覽器驗證保護新的 shell contract，避免之後再回到局部補丁模式。

**Non-Goals:**

- 不重新設計 playback shell 的視覺樣式。
- 不為小螢幕額外建立第二套管理頁版面。
- 不重寫各管理 route 的頁面內容，只調整 shell 與直接受其影響的驗證。

## Decisions

### Adopt a single whole-page management canvas

管理頁 shell 改為單一 canvas owner，由 ManagementShellFrame 擁有整體 viewport、canvas 與 slot 佈局。管理頁不再保留「外層未縮放 shell + 內層縮放內容框」的 split model。

選這個方案而不是只調 header 字級或只把 header/footer 移進內容框，是因為需求已明確要求 whole-page canvas 與 visual consistency 優先。只有把 header、content、footer 放進同一張畫布，才能讓播放頁與管理頁真的共享同一種 shell 比例。

### Reuse playback canvas layout math and explicit slot heights

管理 shell 直接複用 DisplayCanvas 目前使用的 computeCanvasLayout() 計算方式，以 1920x1080 為固定基準畫布，並明確把 slot 高度定義為：header 110px、content 898px、footer 72px。scale 行為與播放頁一致，不額外 clamp 到 1。

這個決策避免管理頁再次維護另一套接近但不一致的縮放公式，也明確淘汰舊模型中的 1920x838 外層基準。838 只屬於歷史內容框，不再是新 shell 的主尺寸。

### Preserve hideChrome inside the same canvas contract

hideChrome 不會讓管理頁退回未縮放 shell。當 hideChrome=false 時，shell 使用 110/898/72 的三段式 slot；當 hideChrome=true 時，canvas 仍存在，但 header/footer slot 收斂為 0，內容區取得完整 1080px 高度。

保留這個 contract 的原因是 DisplayPagesEditor edit mode 已依賴 hideChrome，而且這種行為屬於 shell 層責任，不應該被推回各 route 自己處理。

### Remove managementFrame route branching

routeMeta.managementFrame 目前只讓部分管理頁走 fixed-fhd 內容框。新的 whole-page canvas 上線後，全部 management routes 都共用同一個 shell contract，因此 managementFrame 旗標從 routeMeta 與 witness tests 一起移除。

這比保留旗標但讓它失效更乾淨，因為實作者與未來維護者不需要再猜哪個 route 是否仍有特殊 shell 意義。

## Implementation Contract

**Behavior**
- 任一 management route 載入後，管理頁 shell SHALL 以固定 1920x1080 畫布承接 header、content、footer，並由外層 viewport 依可視尺寸計算單一 scale。
- `/brand`、`/display-pages/editor`、既有 fixed-fhd routes、以及其他 management routes SHALL 使用同一個 shell model。
- `hideChrome=true` 時，管理 shell SHALL 保留 canvas 結構，但只渲染內容區，內容區高度 SHALL 佔滿整張畫布的可用高度。

**Interface / data shape**
- `ManagementShellFrame` 保留為可直接引用的低階 shell primitive。
- `ManagementShell` 與 `ManagementShellRoute` 保留為 route-level 包裝。
- `routeMeta` 不再以 `managementFrame` 欄位控制 shell 分流。
- 管理 shell 的 scale 計算直接沿用 computeCanvasLayout(viewport, design) 的單一縮放與置中語義。

**Failure modes / fallback**
- 視窗縮小時，管理頁允許整體縮小，不以局部回退方式恢復未縮放 header/footer。
- 高內容頁面以內容區捲動為主，不允許內容高度把 header/footer 擠出 shell 合約。
- 若某個管理頁目前依賴舊的外層未縮放尺寸，補償 SHALL 落在 shell 邊界或內容容器，而不是把 route 拉回舊模型。

**Acceptance criteria**
- 結構測試能證明管理頁 header、content、footer 位於同一個縮放畫布內。
- route witness tests 能證明 management routes 不再依賴 managementFrame 分流。
- hideChrome 測試能證明管理頁在隱藏 chrome 時仍維持 canvas contract。
- 瀏覽器驗證能證明相同 viewport 下管理頁與播放頁 header 的感知比例一致，且管理頁內容仍可捲動操作。

**Scope boundaries**
- In scope: ManagementShellFrame、ManagementShell、routeMeta、管理 shell witness tests、必要的 browser/layout regression coverage。
- Out of scope: playback shell 視覺重設、小螢幕專用 UI、各 management route 內容功能改版。

## Risks / Trade-offs

- [一般管理頁在小螢幕變小] → 接受這個 trade-off，並用內容區捲動維持操作性，而不是局部破壞整站一致性。
- [舊 route 依賴未縮放尺寸] → 優先在 shell 容器或內容容器補償，避免把例外散到每個 route。
- [ManagementFixedLayoutFrame 成為半殘留 abstraction] → 若實作確認已無剩餘用途，直接移除；若仍需保留，只能作為內容工具，不能再承接頂層 scale。

## Migration Plan

1. 先把 management shell 改成單一 whole-page canvas，保留既有 exports。
2. 移除 routeMeta 的 managementFrame 分流，讓所有 management routes 走同一個 shell。
3. 更新 shell witness tests 與 hideChrome coverage，改為保護新的 canvas contract。
4. 補齊瀏覽器回歸驗證，確認 header 比例與內容可用性。

## Open Questions

- 無。需求已確認採用全站統一、whole-page canvas、visual consistency 優先。
