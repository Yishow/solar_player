# 來源側欄與視覺層級

## Why

`SourceDetailsDrawer.tsx` 已有 modal、鍵盤循環與返回焦點，但主要操作仍在背景 Sources 頁，footer 只有關閉。`Sources.tsx` 每次 render 重建 `onClose` 與 return-focus 物件，而 drawer effect 依賴兩者，存在編輯或即時更新時重新執行焦點初始化的風險。`GenericSourceCard` 使用 viewport `lg:grid-cols-12`，無法反映側欄的實際窄寬；Managed 卡片進入側欄後還需再次展開。

本提案先修可操作性，再改善視覺，不以加陰影取代工作流程設計。分析基準已重核 main `fd405ebc`（相關既有 UI 程式與 `0425ed2` 相同），屬原始碼審閱，未宣稱已在瀏覽器重現。

## What Changes

- 建立固定標題、分頁、可捲動內容、固定操作列的單一 inspector。
- 預設「概覽」，另有「對應與轉換」「接收樣本」「使用情況」；選中的內容不再藏在第二層卡片展開按鈕後。
- 表單依容器寬度重排，短編輯留在側欄，複雜轉換切至同草稿的完整工作區。
- 在側欄內提供明確 save/discard/error feedback；交易能力由 E 提供，禁止把全量儲存包裝成單筆儲存。
- 將焦點、Escape、背景隔離、捲動鎖定及使用後返回位置寫成可驗收行為。

## Capabilities

### New Capabilities

無；沿用既有資料中樞工作區能力。

### Modified Capabilities

- `data-hub-task-workspace`：修改既有可及性要求，新增側欄結構、容器排版、擁有權與展開行為。

## Impact

前端：SourceDetailsDrawer、Sources、SourceCards、workspaceContext、draftGuard；可能新增 focused inspector 子元件與局部 CSS tokens。不得改全站 mgmt 樣式造成其他管理頁漂移。

正式啟用單筆儲存依賴 `harden-data-hub-source-edit-transactions`。焦點與排版修復可先獨立落地。無正式資料遷移、MQTT 發佈或播放頁變更。

## Non-goals

不重做 settings 全域導覽、不新增常駐第三欄、不改 FHD 播放視覺、不改資料解析演算法、不提供任意 JavaScript 轉換、不假造歷史接收紀錄。

## 2026-09-15 跨發布端審查更新

本輪基準為 `fd405ebc2957232b6c622071622b9c7d830a3a42`。本 change 仍是未實作提案，不勾選產品驗收、不歸檔。與本輪新增的 `plan-power-mqtt-publishing-and-kn-onboarding` 共用 [MQTT-OWNERSHIP](../../../docs/plans/data-hub-reception-ux/MQTT-OWNERSHIP.md) 與 [PUBLISH-TAG-REGISTER](../../../docs/plans/data-hub-reception-ux/PUBLISH-TAG-REGISTER.md)。

來源側欄另顯示發布端、訂閱擁有者、原始／計算來源、時間證據與上游設定責任；Solar 託管來源維持唯讀。

## 2026-09-16 工程別修訂（取代舊 KN 逐錶前提）

側欄以觀音／工程別為標題，sourceKind=engineering 可為正式來源；物理錶欄位只屬physical分支，期間與dataRevision不混入設定dirty。未批准virtual仍只診斷。

觀音結果契約由 [`add-kn-engineering-mqtt-sources`](../add-kn-engineering-mqtt-sources/proposal.md) 的 KNE/EPR 要求負責；本文件舊段落中的 DDE/physical/raw 與 F v1 前置僅適用明確選擇的物理來源，不得套成工程別必要條件。A 的焦點、B 的路由、C 的連線責任、D 的預覽及 E 的配置安全依原規格保留。需要逐來源核對的是工程成果模式與涵蓋範圍，不是上游每顆錶。
