## 1. MQTT Page Alignment

- [x] 1.1 完成 “Align the MQTT settings page as a dedicated high-risk change” 並對應 ### Isolate the MQTT settings page as a dedicated high-risk change，明確限制本 change 只處理 `/settings/mqtt`；驗證方式為內容 review，確認其他 settings routes 不在本 scope。
- [x] 1.2 完成 `mqtt-settings-page-alignment` 的 `/settings/mqtt` prototype 對位，讓 broker config、topic mapping、status、action area 接近 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/09-mqtt-settings.html`；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/09-mqtt-settings.html`。

## 2. High-Risk Interaction Preservation

- [x] 2.1 完成 “Preserve MQTT save, test, topic-mapping, and feedback behavior” 並對應 ### Preserve MQTT save, test, and topic-mapping behavior before visual polish，確認 load/save/test/topic mapping/status/error flows 不回歸；驗證方式為執行 `pnpm --filter @solar-display/server test -- src/routes/settings-mqtt.test.ts src/routes/settings-mqtt-save-regression.test.ts`。
- [x] 2.2 完成 ### Centralize MQTT display-state mapping，把 broker status、topic rows、disabled/loading/error state 的 display mapping 集中整理；驗證方式為 code review，確認狀態判斷沒有散落在多個 JSX 分支。
- [x] 2.3 完成 MQTT evidence bundle，保存 save/test 成功與失敗各至少一組 screenshot 與 smoke note；驗證方式為內容 review，確認 evidence bundle 覆蓋 success 和 error 兩種情境。
