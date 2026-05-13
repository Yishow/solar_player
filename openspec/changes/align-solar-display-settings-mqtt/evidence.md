# MQTT Settings Evidence

## Scope Review

- 本 change 僅修改 `/settings/mqtt` 對位、page-local display mapping、以及為了保住 MQTT settings save/test 行為所需的 shared API error parsing 與 server CORS preflight。
- 未修改 `/settings/playback`、`/settings/images`、`/settings/circuits` 或其他 settings route 畫面結構。

## Verification Commands

- `pnpm --filter @solar-display/web test -- src/components/shellFoundation.test.ts src/pages/Overview/viewModel.test.ts src/pages/Solar/viewModel.test.ts src/pages/FactoryCircuit/viewModel.test.ts src/pages/Images/viewModel.test.ts src/pages/Sustainability/viewModel.test.ts src/pages/PlaybackSettings/viewModel.test.ts src/pages/ImageManagement/viewModel.test.ts src/pages/MqttSettings/viewModel.test.ts src/services/api.test.ts src/hooks/playbackRouteNavigation.test.ts src/hooks/playbackRouteSync.test.ts src/layouts/offlineRouting.test.ts`
- `pnpm --filter @solar-display/web build`
- `pnpm --filter @solar-display/server exec tsx --test src/routes/settings-mqtt.test.ts`
- `pnpm --filter @solar-display/server exec tsx --test src/routes/settings-mqtt-save-regression.test.ts`

## Browser Smoke

Date:
2026-05-13

Runtime setup:
- web: `VITE_API_BASE_URL=http://127.0.0.1:3300 pnpm --filter @solar-display/web dev`
- server: `HOST=127.0.0.1 PORT=3300 DATA_DIR=/tmp/solar-mqtt-smoke.d6hZWC/data DATABASE_PATH=/tmp/solar-mqtt-smoke.d6hZWC/data/solar-display.sqlite MQTT_BROKER=127.0.0.1 MQTT_PORT=18830 MQTT_CLIENT_ID=solar-display-smoke pnpm --filter @solar-display/server dev`
- broker: `pnpm dlx aedes-cli --host 127.0.0.1 --port 18830 start`

### Success: test connection

- Steps: reload `/settings/mqtt` -> 切換 Data Mode 到 `MQTT` -> 點擊 `Test connection`
- Expected: feedback banner 清楚顯示 test success，不再被舊的 broker status 標題覆蓋
- Observed: banner 顯示 `Test connection 成功`，detail 顯示 `Connected successfully`
- Screenshot: `screenshots/mqtt-test-success.png`

### Success: save settings

- Steps: 在同一組 broker 設定下點擊 `Save settings`
- Expected: cross-origin dev preflight 不阻塞 PUT，save 後顯示重新連線成功
- Observed: banner 顯示 `Broker 已連線` 與 `MQTT broker 設定已儲存並重新連線。`
- Screenshot: `screenshots/mqtt-save-success.png`

### Error: test connection failure

- Steps: 將 broker port 改成 `18831` -> 點擊 `Test connection`
- Expected: failure banner 可見，且不要把整包 JSON 直接顯示給使用者
- Observed: banner 顯示 `connect ECONNREFUSED 127.0.0.1:18831`
- Screenshot: `screenshots/mqtt-test-error.png`

## Notes

- Smoke 過程中另外抓到兩個 regression，已一併修補：
  - `Test connection` 成功時，feedback banner 原本仍顯示 `Broker 未連線`
  - cross-origin Vite dev 環境下，`Save settings` 的 `PUT /api/settings/mqtt` 原本被 CORS preflight 擋下
