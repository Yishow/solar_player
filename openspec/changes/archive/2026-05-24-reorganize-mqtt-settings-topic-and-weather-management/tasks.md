## 1. Topic 工作區重組

- [x] 1.1 實作 `Merge live topic status into editable overview rows`，讓 `Stream MQTT runtime preview feedback to the management surface` 與 `Preserve a readable fallback when live MQTT preview streaming is unavailable` 在新的可編輯 topic rows 內同時成立：operator 能在同一列同時看到 runtime 狀態、最新值、最後更新時間並直接編輯 topic/unit/enabled，且 streaming 中斷時仍可辨識 fallback/polling 狀態；以 `pnpm --filter @solar-display/web exec tsx --test src/pages/MqttSettings/viewModel.test.ts src/pages/MqttSettings/MqttSettingsContent.test.ts` 驗證。
- [x] 1.2 實作 `Keep coverage and runtime summary at the top of the editable topic workspace`，讓 `Surface MQTT coverage findings inside MQTT Settings` 保留在同一張 topic 主卡中，operator 可不離開工作區就辨識並修正 mapping gap；以 `pnpm --filter @solar-display/web exec tsx --test src/pages/MqttSettings/viewModel.test.ts src/pages/MqttSettings/MqttSettingsContent.test.ts` 驗證。

## 2. Weather card authoring

- [x] 2.1 實作 `Put weather enable and field presets inside the weather card`，讓 `Configure weather settings from MQTT Settings` 成立：weather card 直接提供 `enabled`、`locationMode`、`countyName`、`stationId`、`preset` 等控制，而不是在 `Test Connection` 左側再放獨立 toggle；以 `pnpm --filter @solar-display/web exec tsx --test src/pages/MqttSettings/MqttSettingsContent.test.ts` 驗證。
- [x] 2.2 [P] 實作 `Model presets as first-class options with custom fallback`，讓 `Support presets with a custom-field fallback` 成立：`精簡 / 標準 / 完整 / 自訂` 會驅動欄位集合，且 custom mode 才顯示明確 field selection controls；以 `pnpm --filter @solar-display/web exec tsx --test src/pages/MqttSettings/weatherFieldPresets.test.ts src/pages/MqttSettings/viewModel.test.ts` 驗證。
- [x] 2.3 實作 `Preview header weather composition before saving`，讓 weather card 會用 pending form state 即時預覽 header 主資訊/次資訊，並在 station options 缺失或 current weather unavailable 時顯示可讀 fallback；以 `pnpm --filter @solar-display/web exec tsx --test src/pages/MqttSettings/MqttSettingsContent.test.ts src/pages/MqttSettings/viewModel.test.ts` 驗證。

## 3. 同步與整體驗證

- [x] 3.1 [P] 將 `MQTT Settings` relevant scopes 收斂為 `mqtt` 與 `weather`，讓 weather remote changes 只刷新此頁需要的區塊，並維持其他 scope 繼續忽略；以 `pnpm --filter @solar-display/web exec tsx --test src/pages/managementDisplaySync.test.ts` 驗證。
- [x] 3.2 收斂 `MqttSettingsContent.tsx`、`viewModel.ts`、`mqttSettings.css` 與 `layout.ts` 的最終版型與空/錯誤狀態，確保 `mqtt-settings-weather-management`、`mqtt-settings-runtime-preview-streaming`、`mqtt-settings-display-coverage` 三條規格同時成立；以 `pnpm --filter @solar-display/web test`、`spectra analyze reorganize-mqtt-settings-topic-and-weather-management --json` 與 `spectra validate reorganize-mqtt-settings-topic-and-weather-management` 驗證。
