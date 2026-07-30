## Context

此 change 消費已完成的 Device／Group API、Pairing API 與 identity-aware liveness snapshot。現有 DeviceStatus 是 runtime diagnostics，不足以完成 Device lifecycle 與 Group 配置。

## Goals / Non-Goals

**Goals:**

- 提供單一 Device Fleet 管理入口。
- 完成 Device、Group、配對與狀態的操作閉環。
- 清楚呈現 unpaired、disabled、offline、duplicate 與 mutation failure。

**Non-Goals:**

- 不新增後端 domain 規則、帳號角色或一般 playback 可見 mutation。
- 不建立 Profile Draft／Publish 或 per-device override。
- 不把 playback pages 改成 management 視覺。

## Decisions

### Add a dedicated lazy management route

新增 /device-fleet lazy route，沿用 ManagementShell 與 route visibility。Playback session 不預載此 chunk；未取得 management trust 時不發管理 API request。

### Separate load model, view model, and mutations

loadModel 一次取得 Device、Group、Default Profile summary 與 liveness；viewModel 純函式產生 rows/status/actions。mutation success 後只刷新受影響 resource，避免整頁 reload。

### Reveal pairing tokens only at creation

Pairing modal 在建立 response 顯示 URL、expiry 與 copy action；關閉後不能由 API 重新讀取明文。Credential 永不進 UI。重新配對需明確確認其會撤銷舊 credential。

## Implementation Contract

**Behavior**

- 管理者可建立/編輯/停用 Device，建立/編輯 Group，指派 cl/kn 與 Default Profile。
- 表格顯示 clientId、displayName、Group、Site、pairing state、last seen、route/page、playback、duplicate warning。
- empty/loading/error/mutation pending 均有明確可讀狀態，mutation pending 防重送。
- unpaired/disabled Client 不顯示成 CL 或 KN 正常播放。

**Interface / data shape**

- API client 使用既有 /api/devices、/api/device-groups、pairing 與 liveness routes。
- ViewModel action 明確區分 pair、re-pair、disable、enable、edit。
- 所有管理文字與 status badge 遵循現有 management components。

**Failure modes**

- 409 group_in_use、duplicate clientId 與 expired pairing token 以 server code 顯示可操作訊息。
- load 部分失敗時保留已成功的 rows 並標示 unavailable section，不偽造狀態。
- management trust 失效回 login/access guidance，不顯示 mutation controls。

**Acceptance criteria**

- viewModel 與 component tests 覆蓋 50 rows、filter、empty、duplicate、re-pair confirm 與 server errors。
- pnpm --filter @solar-display/web test、pnpm test/build/verify 通過。
- DeviceStatus 現有 diagnostics 不回歸。

**Scope boundaries**

- In scope：web management route、API client、DeviceStatus integration。
- Out of scope：server schema、pairing cryptography、FHD playback page styling。

## Risks / Trade-offs

- [50 rows 造成管理頁過重] → 單一表格採穩定 key 與 bounded derived view，不引入虛擬化依賴。
- [配對 URL 被畫面殘留] → modal close 即清除記憶體 state，API 不提供再次讀取。
