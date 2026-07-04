## 1. 資料模型與後端服務擴充

- [x] 1.1 修改 `packages/shared/src/displayReadiness.ts` 以擴展及重構全域的 Slot Keys。這對應了「決策二：重構與擴展全域的 Slot Keys」與「Requirement: Slot Keys Expansion and Rename」，涵蓋設計中的「1. 介面與資料結構：」變更。將 `displayCircuitSlotKeys` 擴展為 8 個 key（`stamping`, `body`, `painting`, `assembly`, `utility`, `office`, `heavy_vehicle`, `ed_coating`）。驗證方式：確認該檔案順利通過 pnpm 類型檢查，且執行 `pnpm run test` 後相關型別正常解析。
- [x] 1.2 更新 `apps/server/src/services/displayStoryService.ts` 以支援 8 個 slots 的 MQTT 數據擷取與預設標籤對應。這對應了「Requirement: Slot Keys Expansion and Rename」，涵蓋設計中的「1. 介面與資料結構：」變更。確保 `slotOrder`、`slotMetricMap` 與 `slotDefaultLabels` 均包含 8 個新 Slot，讓同步服務能讀取這兩個新增的 MQTT 功率值。驗證方式：確認 `pnpm --filter @solar-display/server test` 相關測試通過，且能正確導出這兩個新 slots。
- [x] 1.3 更新 `apps/server/src/db/seed.ts`，實作「決策一：在 Page Registry 註冊雙實例頁面，而非前端 page-local切換」與「Requirement: Page Registry Multi-site Routing」，涵蓋設計中的「1. 介面與資料結構：」與「2. 中壢廠與觀音廠配置細節：」變更。在初始化資料庫時，將舊有迴路刪除並重新註冊符合廠區配置的 8 個迴路，同時在 `display_page_registry` 中註冊中壢廠與觀音廠兩個頁面實例。驗證方式：清空資料庫並重新執行 seed，確認 `display_page_registry` 內有 `factory-circuit`（中壢）與 `factory-circuit-guanyin`（觀音）兩筆資料。

## 2. 前端頁面配置與佈局更新

- [x] 2.1 擴充 `apps/web/src/pages/FactoryCircuit/displayPageConfig.ts` 內的 UI 幾何坐標與種子設定。這對應了「Requirement: Site-Specific Load Visibility and Geometry Configuration」，涵蓋設計中的「2. 中壢廠與觀音廠配置細節：」變更。為中壢廠（6個工程）與觀音廠（8個工程）分別在 seed config 中定義預設的 visible 狀態，觀音廠的 8 個 Row 套用緊湊座標（高 65px、間距 74px），而中壢廠保持 6 個工程 visible（大車/ED電著設為 invisible）。驗證方式：在 `apps/web/src/pages/FactoryCircuit/configRender.test.ts` 中確認新 key 座標屬性正確渲染。
- [x] 2.2 更新 `apps/web/src/pages/CircuitSettings/viewModel.ts` 的 `circuitSlotLabelMap` 標籤與設定值。這對應了「Requirement: Slot Keys Expansion and Rename」，涵蓋設計中的「1. 介面與資料結構：」與「2. 中壢廠與觀音廠配置細節：」變更。讓管理者在設定頁面可以將迴路指派給新的 8 個工程 Slots。驗證方式：執行 `pnpm --filter @solar-display/web test` 驗證 viewModel 測試是否全數綠燈。
- [x] 2.3 在 `apps/web/src/pages/FactoryCircuit/layout.ts` 中規劃觀音廠與中壢廠的初始坐標變數，支援 8 列的排版需求。這對應了「Requirement: Site-Specific Load Visibility and Geometry Configuration」，包含設計中的「2. 中壢廠與觀音廠配置細節：」變更。驗證方式：執行 `pnpm run test` 通過 Layout 測試。

## 3. 前端播放頁面重構與動態 SVG 排線

- [x] 3.1 在 `apps/web/src/pages/FactoryCircuit/index.tsx` 與 `viewModel.ts` 中實作「決策三：動態 SVG 排線取代靜態 6 條路徑寫死」與「Requirement: Dynamic SVG Routing Line Calculation」。將原本寫死的 SVG 分岔 path 移除，改為讀取當前可見的負載行（沖壓、車身等）並動態運算其 top 座標差，以拼接出吻合卡片中線的圓滑 SVG 貝氏曲線與端點。驗證方式：本機啟動 `pnpm run dev`，手動切換到 `/factory-circuit` 與 `/factory-circuit-guanyin`，確認連線與卡片左側完美貼合，無 any 穿幫 or 懸空。
- [x] 3.2 執行 Full HD 驗證工作流以符合產出水準。這對應了「Requirement: Page Registry Multi-site Routing」與「決策一：在 Page Registry 註冊雙實例頁面，而非前端 page-local 切換」，涵蓋設計中的「3. 驗證條件：」。執行專案的 FHD witness 命令 `pnpm run fhd:witness` 對中壢廠 `/factory-circuit` 與觀音廠 `/factory-circuit-guanyin` 進行截圖驗證，確認其符合 `docs/reference/FHD/` 門檻。驗證方式：確認產生的截圖中，中壢廠顯示 6 個工程且 SVG 對齊；觀音廠顯示 8 個工程且 SVG 對齊。
