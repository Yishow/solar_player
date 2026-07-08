## 1. Topic 工作區三分頁整合

- [x] 1.1 實作 `Combine MQTT source mode and topic controls into a three-tab Topic workspace`，讓 `/settings/mqtt` 只呈現單一 Topic 工作區並提供 `資料來源模式`、`Topic mapping`、`卡片資料管理` 三個 tab；驗證：`apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts` 覆蓋三個 tab 與資料來源模式 card 不再獨立渲染。
- [x] 1.2 實作 `Merge data mode and topic controls into one tabbed Topic workspace` 的 UI state contract，讓 data mode/broker controls 與 topic mapping controls 在切換 tab 後保持既有 action、feedback、disabled state；驗證：`apps/web/src/pages/MqttSettings/viewModel.test.ts` 與 `MqttSettingsContent.test.ts` 覆蓋 broker test feedback、topic save/reload/publish 狀態。
- [x] 1.3 實作 `Preserve MQTT management actions across tab navigation`，讓未儲存 topic draft、broker draft 與最新 connection feedback 在 tab 切換後保留；驗證：`apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts` 模擬編輯後切換 tab 並確認 draft indicator 與欄位值仍存在。

## 2. 卡片資料診斷服務

- [x] 2.1 實作 `Expose monitoring card diagnostics for management surfaces`，讓服務端提供 Overview、Solar、Factory Circuit value cards 的 card target identity、metric identity、source value、display value、unit、source topics、dependencies、fallback reason、freshness、last update；驗證：新增或擴充 `apps/server/src/routes/display-story.test.ts` 或 `apps/server/src/routes/display-card-data.test.ts` 覆蓋 JSON contract。
- [x] 2.2 實作 `Expose household-equivalent derivation to card data management`，讓 Sustainability household cards 的診斷資料揭露 self-consumption basis、daily summary 或 cumulative counter、calculation profile fields、computed household count 與 aggregate update；驗證：`apps/server/src/routes/sustainability-story.test.ts` 或 `display-card-data.test.ts` 覆蓋 daily 與 cumulative row。
- [x] 2.3 實作 `Classify missing values instead of showing only double dash`，讓 card diagnostics 將缺值分類為 `missing-topic`、`idle-topic`、`waiting-aggregate`、`formula-input-missing`、`manual-only`、`overridden` 並回傳 blocking input；驗證：服務端測試覆蓋至少 missing topic、formula input missing、waiting aggregate 三種狀態。
- [x] 2.4 實作 `Present card-centric data diagnostics in the MQTT Topic workspace` 的前端資料列，讓 `卡片資料管理` tab 顯示 page/card/metric、目前顯示值、來源 topic、依賴項、公式或聚合來源、最後更新與狀態；驗證：`apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts` 或新增 `CardDataManagementTab.test.tsx` 覆蓋主要欄位與空狀態。

## 3. 補值入口與 MQTT publish 串接

- [x] 3.1 實作 `Provide data completion actions from card diagnostics`，讓已有 topic mapping 的 metric 可從卡片資料管理列直接發佈 numeric test value 到 broker；驗證：`apps/server/src/routes/settings-mqtt.test.ts` 保持現有 publish path，前端測試確認 card action 呼叫相同 metric-key publish handler。
- [x] 3.2 實作缺 topic 的導引行為，讓 card diagnostics row 可切到 `Topic mapping` tab 並標示缺少的 metric key；驗證：`MqttSettingsContent.test.ts` 模擬點擊 action 後確認 active tab 與 metric highlight target。
- [x] 3.3 實作 calculation settings 依賴提示，讓永續與公式卡片 row 顯示相關 profile field 並提供可用的管理入口；驗證：前端測試確認 `householdDailyUsageKwh`、`householdMonthlyUsageKwh` 等欄位名稱出現在管理列。

## 4. Display-only 覆寫

- [x] 4.1 實作 `Persist display-only card value overrides separately from true data` 與 `Keep override state separate from editor visibility and card authoring`，建立獨立 override persistence/API，讓覆寫不寫入 MQTT、live metrics、daily summaries、cumulative counters 或 editor visibility；驗證：server route/service tests 確認 apply/clear override 後真實資料表值不變。
- [x] 4.2 實作 `Model card data management as diagnostics plus display-only overrides` 的前端操作，讓卡片資料管理 tab 可設定、顯示、停用與清除 override，且管理面同時顯示原始 source value 與 override value；驗證：前端測試覆蓋 apply、clear、invalid numeric input、overridden badge/state。
- [x] 4.3 實作 `Apply display overrides after monitoring source resolution`，讓 monitoring playback story payload 套用 active override 但 freshness/source topic metadata 仍描述原始來源；驗證：`apps/server/src/services/displayStoryService.test.ts` 覆蓋 active 與 inactive/expired override。
- [x] 4.4 實作 `Apply display overrides without changing household-equivalent formulas`，讓 Sustainability household card 覆寫只改 display payload，不改 calculation profile 或 self-consumption aggregate；驗證：`apps/server/src/services/householdEquivalenceService.test.ts` 或 `sustainabilityStoryService.test.ts` 覆蓋 override apply/clear 後公式輸出仍可回復。

## 5. 整體驗證與收斂

- [x] 5.1 驗證 Spectra artifacts 與 analyzer，確認所有 requirement 與 design decision 都被 tasks 覆蓋；驗證：`rtk spectra validate add-topic-workspace-card-data-management` 與 `rtk spectra analyze add-topic-workspace-card-data-management --json` 通過且無 Critical。
- [x] 5.2 執行 focused server/web tests，確認三分頁、diagnostics、publish actions、display-only overrides 的行為契約通過；驗證：實作階段列出實際 test commands 與通過輸出。
- [x] 5.3 執行 build 與 playback witness closeout，確認 management 變更未破壞 runtime payload 或 FHD playback；驗證：`rtk pnpm run build` 與依 repo 規則執行 fresh FHD witness。
