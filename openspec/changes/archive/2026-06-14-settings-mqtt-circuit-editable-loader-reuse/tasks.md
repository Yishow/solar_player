## 1. 建立 reusable editable loader

- [x] [P] 1.1 交付 MQTT and Circuit Settings restore persisted controls through reusable editable loaders，並落實 Reusable editable loader for persisted controls：在 apps/web/src/pages/MqttSettings/index.tsx 與 apps/web/src/pages/CircuitSettings/index.tsx 收斂 bootstrap / resync / mutation follow-up loader contract，並以 focused tests 驗證 persisted controls 先恢復。
- [x] [P] 1.2 交付 MQTT and Circuit diagnostics preserve existing safety behavior，並落實 Deferred diagnostics stay outside the editable lane：以 readiness、weather、stream diagnostics tests 驗證 deferred lane 失敗時不清空 persisted controls。

## 2. 鎖定安全邊界

- [x] 2.1 交付 MQTT and Circuit diagnostics preserve existing safety behavior，並落實 No-regression dirty guard and access behavior：以 dirty guard、masked password、save / delete / test focused tests、spectra analyze、與 spectra validate 驗證安全邊界不退化。
