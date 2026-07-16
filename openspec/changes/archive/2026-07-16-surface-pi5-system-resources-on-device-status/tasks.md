## 1. Server 按需硬體 telemetry

- [x] 1.1 [P] 先在 `apps/server/src/routes/device.test.ts` 建立 failing tests，證明「用 nullable 結構表達真實值與 unavailable」契約涵蓋 CPU thermal 溫度、fan RPM、pwm-fan cooling state 與來源不可用，而且單一來源失敗不會使 `/api/device/status` 失敗；verify: `pnpm --filter @solar-display/server test src/routes/device.test.ts` 必須先因缺少新 telemetry 而失敗。
- [x] 1.2 在 `apps/server/src/routes/device.ts` 實作「按需讀取 Linux procfs 與 sysfs」，讓通過 trusted-management-read 的既有 request 回傳 nullable `temperature` 與 `fan` 結構，且不新增 timer、持久化或 `/health` 工作；verify: `pnpm --filter @solar-display/server test src/routes/device.test.ts` 通過並斷言實際值與 unavailable 狀態。

## 2. Device Status 最小呈現

- [x] 2.1 [P] 先在 `apps/web/src/pages/DeviceStatus/viewModel.test.ts` 建立 failing tests，證明可用與不可用的溫度會進入既有 resource card、RPM 與 cooling state 會成為風扇資訊列；verify: `pnpm --filter @solar-display/web test src/pages/DeviceStatus/viewModel.test.ts` 必須先因缺少格式化行為而失敗。
- [x] 2.2 在 `apps/web/src/services/api.ts`、`apps/web/src/pages/DeviceStatus/viewModel.ts` 與 `apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx` 實作「保留四張 gauge 並把風扇放入裝置資訊」，讓 API 型別保留 nullable telemetry、溫度卡顯示攝氏量測或 `Unavailable`，風扇列依序顯示 RPM、cooling state 或 `Unavailable`，且不新增頁面輪詢；verify: `pnpm --filter @solar-display/web test src/pages/DeviceStatus/viewModel.test.ts src/pages/DeviceStatus/DeviceStatusContent.test.tsx` 通過。

## 3. 契約與交付驗證

- [x] 3.1 驗證 `Surface Pi 5 host resources with on-demand low-overhead telemetry` requirement 已完整交付，確認沒有背景採集器、MQTT、DB 寫入或新 polling，並執行 `pnpm verify`；verify: focused server/web tests 與 `pnpm verify` 全部通過，人工檢視 diff 僅包含本 change 的 server route、Device Status 與測試。
