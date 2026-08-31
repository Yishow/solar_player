## Why

Data Hub 目前將語意指標分散在 7 個獨立子分頁中（資料連線、資料來源、語意指標、衍生指標、使用情形、資料診斷、外部資料），導致維運人員在查看單一指標的即時數值時，必須在「語意指標」、「使用情形」與「資料診斷」之間反覆跳頁，造成嚴重的操作破碎感與高認知負擔。

本提案旨在將指標的「即時數值」、「引用頁面 (Usage)」與「健康診斷 (Diagnostics)」一站式整併至語意指標卡片中，並將 Data Hub 分頁導覽精簡收斂，讓維運人員一眼即可看懂並掌握全盤資料。

## What Changes

- **一站式語意指標卡片 (Unified Metric Profile Cards)**：在 `Metrics.tsx` 的指標卡片中內嵌「使用情形 (Usage)」與「資料診斷 (Diagnostics)」隨需展開區塊，點擊即可在卡片內原地查看大螢幕引用清單與健康延遲資訊，無需跳頁。
- **Data Hub 導覽分頁收斂**：將 Data Hub 頂部導覽列由 7 個分頁精簡為 4 個核心分頁（`資料連線`、`資料來源`、`語意指標`、`外部資料`），移除多餘的獨立 Usage 與 Diagnostics 頁籤。
- **相容性路由重導向 (Compatibility Redirects)**：保留 `/settings/data-hub/usage` 與 `/settings/data-hub/diagnostics` 路由，自動重導向至 `/settings/data-hub/metrics` 並帶入對應 query 參數，確保舊連結與深層連結不失效。
- **Sources 託管轉接器預設收合**：在 `Sources.tsx` 將唯讀的「託管 Solar 轉接器」預設為單行輕量狀態列，釋放 70% 空間，讓自訂通用 MQTT 主題成為操作焦點。
- **功能零退化保證**：100% 完整保留即時數值跳動 (Live WebSockets)、範圍篩選 (CL/KN/Global/All)、新鮮度標籤、使用情形列表與合約診斷資訊。

## Capabilities

### Modified Capabilities

- `data-hub-management-surface`: 更新 Data Hub 導覽分頁架構與語意指標卡片合約，整併使用情形與資料診斷至語意指標清單中。

## Impact

- `apps/web/src/app/dataHub.ts`：更新 `DATA_HUB_SECTIONS` 清單與可見分頁定義。
- `apps/web/src/app/router.tsx`：更新 Data Hub 子路由與重導向設定。
- `apps/web/src/pages/DataHub/Metrics.tsx`：實作一站式內嵌使用情形與診斷展開元件。
- `apps/web/src/pages/DataHub/SourceCards.tsx`：實作託管轉接器收合微列元件。
- `apps/web/src/pages/DataHub/Sources.tsx`：更新託管區塊排版。
- `apps/web/src/pages/DataHub/Metrics.test.tsx`、`apps/web/src/pages/DataHub/Sources.test.tsx`：更新單元測試。
