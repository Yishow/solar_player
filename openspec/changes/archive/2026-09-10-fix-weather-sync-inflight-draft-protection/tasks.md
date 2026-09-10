## 1. 紅燈回歸測試

- [x] [P] 1.1 在新增 apps/web/src/pages/MqttSettings/useMqttSettingsData.test.ts 掛載實際 data owner、remote-sync 與 Weather mutators；以 jsdom/react-dom 與 deferred promises 建立 Guard in-flight Weather settings reload responses 的 RED cases：clean→read→edit、edit-and-revert、field toggle、initial/cached full-model、latest success/error、stale finally 與 unmount。確認新 assertions 實際命中覆寫缺陷，不以 source regex 取代。
- [x] [P] 1.2 在 apps/web/src/hooks/displaySyncDraftGuard.test.ts 及既有 apps/web/src/pages/MqttSettings/index.test.ts、apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts 補 Resolve deferred Weather reloads with explicit operator actions 的 guard/render cases：keep editing 不 fetch、deferred outcome 不被 completion/clean effect 清除、一般 void consumers 保持相容；先確認目前缺口。

## 2. Weather response commit gate

- [x] 2.1 依 Decision 1: Weather request and local-mutation generations，在 apps/web/src/pages/MqttSettings/useMqttSettingsData.ts 建立 request/mounted/mutation gate，於 apps/web/src/pages/MqttSettings/useMqttSettingsWeather.ts 的本地 setter 入口同步推進 mutation ref；direct read 與 applyMqttEditableModel 的 Weather pair 共用 gate。用 1.1 驗證 edit-and-revert、full-model 與 obsolete success/error/finally 不改 state/loading/error/pending。
- [x] 2.2 依 Decision 2: Preserve Weather outcomes through the shared guard，在 data caller 捕捉 Weather outcome 穿越 Promise<void> aggregation，不修改共享 loader；經 apps/web/src/pages/MqttSettings/useMqttSettingsRemoteSync.ts 與 apps/web/src/hooks/displaySyncDraftGuard.ts 的 Weather opt-in seam 傳遞 token/currentness，只有同一 committed 清 pending。以 1.1、1.2 驗證 deferred 在 clean effect 後仍可見、一般 guard consumers 及 broker/topic 行為不變。

## 3. 明確解決與介面保持

- [x] 3.1 依 Decision 3: Discard authorizes only the draft present at the click，在實際 owner mounted tests 補 discard→new edit、discard→edit-and-revert、discard success/failure、keep editing 與舊 completion；實作 click-scoped mutation 授權，後續修改保留新 draft、舊 baseline 與 pending，安全成功才清除。不新增 MQTT save owner、不改 Data Hub save。
- [x] 3.2 保持 apps/web/src/pages/MqttSettings/useMqttSettingsWeather.ts、apps/web/src/pages/MqttSettings/MqttWeatherPanel.tsx、apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx 與 apps/web/src/pages/MqttSettings/MqttSettingsContent.types.ts 的 Weather controls、preview 與既有 presentation wiring 不變，只讓 pending remote change 可見；以 apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts 驗證 Weather controls、banner 與非 Weather surface isolation。

## 4. 綠燈與交付閘門

- [x] 4.1 完成兩個 ADDED requirements 的 GREEN suite，執行 pnpm --filter @solar-display/web test -- src/pages/MqttSettings/useMqttSettingsData.test.ts src/hooks/displaySyncDraftGuard.test.ts src/pages/MqttSettings/index.test.ts src/pages/MqttSettings/MqttSettingsContent.test.ts，保存 mounted race、aggregation、banner 與 broker/topic regression 的實際結果。
- [x] 4.2 review 最終 scoped diff 與 git diff --check，對照兩個 requirement 的全部 scenarios、三個 Decisions 與 Impact 路徑；修完 findings 並重跑受影響 focused tests。確認未修改 server/API、Data Hub、共享 loader、broker/topic 行為或視覺版面。
- [x] 4.3 review/focused tests 完成後，以最終版本執行 pnpm verify；以 PASS/FAIL/NOT RUN 記錄結果，明列 browser、production、deployment、FHD 與人工 acceptance 未驗證，不能以 local gate 取代。
