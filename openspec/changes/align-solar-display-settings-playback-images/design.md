## Context

這個 change 對應 umbrella rollout 的 Management Batch A。它只處理低風險 settings routes，目標是先建立 management family 的版面語言，但不碰 MQTT 或 circuits 的高風險互動流。

## Goals / Non-Goals

**Goals:**

- 讓 `/settings/playback` 對齊 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/07-playback-settings.html`。
- 讓 `/settings/images` 對齊 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/08-image-management.html`。
- 保留既有保存、排序、圖片狀態與操作定位。

**Non-Goals:**

- 不處理 `/settings/mqtt`。
- 不處理 `/settings/circuits`。
- 不處理 monitoring pages。

## Decisions

### Treat playback settings and image management as the low-risk settings batch

這兩頁先建立 management 視覺語言，但避免高風險狀態流進入同一個 change。

### Preserve settings interactions before optimizing layout density

互動契約必須先保留，再做 FHD 密度調整。

## Implementation Contract

**Behavior**

- `/settings/playback` 完成後，排程、重排、啟用狀態與儲存行為應保持可用。
- `/settings/images` 完成後，資產狀態列、快速操作區與長欄位可讀性應提升。

**Interface / data shape**

- 既有 playback settings API flow 不變。
- 既有 images route / API flow 不變。

**Failure modes**

- 若重排行為因版面調整而失效，這個 change 視為失敗。
- 若 image rows 因 FHD 切版而難讀，這個 change 視為未完成。

**Acceptance criteria**

- `pnpm --filter @solar-display/web build` 成功。
- `pnpm --filter @solar-display/server test -- src/routes/playback.test.ts src/routes/images.test.ts` 成功。
- 人工 smoke test 排序、啟用、儲存與資產狀態可讀性。

**Scope boundaries**

- In scope：`/settings/playback`、`/settings/images`。
- Out of scope：MQTT、circuits、monitoring pages。

## Risks / Trade-offs

- [如果這批混入 MQTT 或 circuits] → 高風險互動流會掩蓋低風險 settings 的驗證。
- [如果只顧 layout 不顧互動] → 最容易造成 regression。
