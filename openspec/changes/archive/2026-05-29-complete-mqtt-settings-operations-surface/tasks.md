## 1. Workspace Guidance

- [x] 1.1 Implement `Keep the three-column workspace but add section-level operations guidance` so `Show section-level draft and runtime guidance across broker, topic, and weather areas` is visible without leaving the single-page workspace; verify with apps/web/src/pages/MqttSettings/index.test.ts and a manual `/settings/mqtt` section-state review.
- [x] 1.2 Implement `Show section-level draft and runtime guidance across broker, topic, and weather areas` so operators can distinguish broker, topic, and weather dirty scopes from healthy runtime sections; verify with apps/web/src/pages/MqttSettings/viewModel.test.ts.

## 2. Topic Workspace Prioritization

- [x] 2.1 Implement `Group topic workspace by display impact rather than treating every row as a flat mapping` so `Present MQTT topic governance with display-impact-aware workspace summaries` is readable alongside direct row editing; verify with apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts.
- [x] 2.2 Implement `Present MQTT topic governance with display-impact-aware workspace summaries` with explicit mapping-gap, idle-runtime, and healthy-row prioritization; verify with apps/web/src/pages/MqttSettings/viewModel.test.ts and a manual coverage-finding scenario.

## 3. Weather Contract Clarity

- [x] 3.1 Implement `Make weather preview an effective shell contract instead of a detached side form` so preset, location, and field choices explain their header outcome in one place; verify with apps/web/src/pages/MqttSettings/weatherFieldPresets.test.ts and apps/web/src/pages/MqttSettings/viewModel.test.ts.
- [x] 3.2 Implement `Treat weather configuration as an effective header contract` with explicit invalid and incomplete draft feedback before save; verify with apps/web/src/pages/MqttSettings/index.test.ts and a manual header-preview review.
