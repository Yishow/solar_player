## Why

Solar Player 的播放設定目前分散在全域 `playback_settings` 與 `display_page_registry` 的播放欄位中。這個模型無法支援後續 Device Group 指派可重用 Playback Profile，也會讓舊 Playback API 與未來 Profile API 容易形成兩套 source of truth。

## What Changes

- 建立正式 Playback Profile、Profile Settings、Profile Pages 與全域 Playback Runtime Policy 資料模型。
- 將既有全域播放設定依責任拆分：內容播放設定遷移至唯一的 Default Playback Profile，Transition 與 Freshness enforcement 遷移至全域 Runtime Policy。
- 讓既有 Playback settings、pages 與 rotation API 成為 Default Profile 與全域 Runtime Policy 的 compatibility façade，對外契約不變。
- 將 display page registry 收斂為頁面 identity/catalog；播放啟用、順序與停留時間由 Default Profile 擁有。
- 補上可重跑 migration、公開 API 等價性與 seed persistence 驗證。
- 新增 Default Profile 與相容層生命週期文件。

## Capabilities

### New Capabilities

- `default-playback-profile-compatibility`: 定義 Default Playback Profile 的遷移、單一寫入來源與既有 Playback API 相容契約。

### Modified Capabilities

- `display-page-registry-and-playback-model`: registry 保留 page identity、template、route、labels 與 archive metadata；播放狀態改由 Profile Page 擁有。

## Impact

- Affected specs: default-playback-profile-compatibility, display-page-registry-and-playback-model
- Affected code: server SQLite migrations, playback/profile/runtime-policy services, display page registry/readiness services, seed logic, API integration tests, architecture documentation
