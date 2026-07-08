## 1. Server publish contract

- [x] 1.1 為「Publish numeric test values through existing MQTT topic mappings」先寫 RED server tests：已啟用的 `selfConsumptionEnergy` mapping 發佈 `1200` 時，fake MQTT client 收到 topic row 的 configured topic 與 payload `{ "value": 1200 }`；驗證：直跑 `pnpm --filter @solar-display/server exec tsx --test src/routes/settings-mqtt.test.ts`，確認新增測試因 endpoint 尚未存在而失敗。
- [x] 1.2 實作「Safe numeric publish from existing topic mappings」與 `POST /api/settings/mqtt/topics/:metricKey/publish` contract：route 只查既有 enabled mapping、固定產生 numeric value payload、不接受任意 topic；驗證：`src/routes/settings-mqtt.test.ts` 的成功案例通過。
- [x] 1.3 實作「Publish result must be observable and fail closed」：`MqttClientService` 提供可等待 publish callback 的結果，disconnected/mock/error state 有明確結果；驗證：直跑 `pnpm --filter @solar-display/server exec tsx --test src/mqtt/MqttClientService.test.ts`，包含 connected success 與 disconnected reject 測試。
- [x] 1.4 補齊 publish failure cases：missing mapping 回 404、disabled mapping/empty topic/disconnected 回 409、non-finite value 回 400，且不呼叫 MQTT client publish；驗證：`pnpm --filter @solar-display/server exec tsx --test src/routes/settings-mqtt.test.ts` 通過所有新增 failure tests。

## 2. MQTT Settings row UI

- [x] [P] 2.1 為「Per-row publish UI in MQTT Settings」先寫 RED web render test：topic row 顯示測試數值 input 與 publish button，無 topic 或 disabled row 時 button disabled；驗證：`pnpm --filter @solar-display/web test MqttSettingsContent.test.ts` 或 repo 現有 web test runner 的對應單檔指令失敗在缺少 UI。
- [x] 2.2 在 `MqttSettings` container 新增 per-row publish state 與 request handler：輸入值不保存到 topic mapping，成功後顯示 message 並 reload topics/readiness；驗證：新增 container/source test 或 content callback test 證明 handler 以 metric key 與 numeric value 呼叫 API。
- [x] 2.3 在 `TopicWorkspaceRow` 與 view model 接上測試發佈 affordance：row model 提供 publish label/disabled reason/runtime feedback，content component 把 handler 傳入 row；驗證：`pnpm --filter @solar-display/web test MqttSettingsContent.test.ts` 通過，並保留既有 topic edit/remove tests。

## 3. Monitoring card source tooltip

- [x] [P] 3.1 為「Expose monitoring card source composition in playback tooltips」先寫 RED tests：Solar self-consumption card tooltip 包含 `selfConsumptionRatio`、`selfConsumptionEnergy`、`consumptionEnergy` 與 visible label `自發自用比例`；驗證：直跑受影響的 Solar render/view model test，確認缺少 tooltip metadata 時失敗。
- [x] 3.2 實作「Source tooltip derived from story metadata」：用 story/view model 的 `metricKey`、`dependencyKeys`、`sourceClass` 與 topic mapping/runtime metadata 生成 deterministic tooltip 字串，格式包含 `Metric:`, `Topic:`, `Depends on:`；驗證：Overview、Solar、Factory Circuit、Sustainability 的 focused tests 覆蓋 direct、derived、aggregate/missing-topic cases。
- [x] 3.3 實作「Keep playback visuals stable」：把 tooltip 接到 shared card frame 或 card header 層，不改 card 尺寸、value row、icon 或 visible copy；驗證：現有 playback render tests 通過，且 focused assertion 證明 tooltip 透過 `title` 或 equivalent accessible attribute 存在。

## 4. Verification and closeout

- [x] 4.1 跑 server regression：`pnpm --filter @solar-display/server exec tsx --test src/routes/settings-mqtt.test.ts src/mqtt/MqttClientService.test.ts`，驗證 publish endpoint、MQTT callback result、failure modes 全部通過。
- [x] 4.2 跑 web regression：`pnpm --filter @solar-display/web test`，驗證 MQTT settings UI 與 playback tooltip tests 未破壞既有管理頁/播放頁行為。
- [x] 4.3 跑 repo-level gate：`pnpm run build`，驗證 shared/server/web type contracts 與 production build 通過。
- [x] 4.4 執行 Spectra hygiene：`spectra validate add-mqtt-topic-test-publish-and-card-source-tooltips` 與 `spectra analyze add-mqtt-topic-test-publish-and-card-source-tooltips --json` 無 Critical/Warning，確認 artifacts 與 tasks 和 specs 對齊。
