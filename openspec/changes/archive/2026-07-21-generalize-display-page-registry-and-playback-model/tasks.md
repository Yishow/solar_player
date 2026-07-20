## 1. Registry contract

- [x] 1.1 實作 `Maintain a first-class display page registry`，建立 `DisplayPageTemplateKey` / `DisplayPageInstance` shared types 與 server-side registry service，落實 `separate template kind from page instance`。
- [x] 1.2 依 `keep supported templates finite` 新增 migration 與 seed，把現有五頁轉成第一批 registry instances，並限制 instance 只能引用受支援 template kinds。

## 2. Runtime and route wiring

- [x] 2.1 實作 `Resolve playback and editing from registry instances`，調整 playback rotation、router host 與 editor page definitions，落實 `resolve routing from registry, not from static route arrays`。
- [x] 2.2 實作 `Maintain a first-class rotation plan for display pages` 所需的 route slug、template compatibility、archive safety 與 duplicate prevention 驗證。

## 3. Management surfaces

- [x] 3.1 讓 `Playback Settings` 支援新增/封存頁面，不再把新增按鈕永久禁用。
- [x] 3.2 讓 `Display Pages Editor` tabs、preview 與 publish state 可跟隨 registry 動態頁面集合。

## 4. Verification

- [x] 4.1 補 server/web targeted tests，覆蓋 registry 升級、route collision、新增頁面與封存頁面情境。
- [x] 4.2 執行 `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 與受影響 package build。
