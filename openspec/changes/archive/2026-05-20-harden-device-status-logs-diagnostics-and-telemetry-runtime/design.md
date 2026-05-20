## Context

`Device Status` 已經能顯示 display operations summary，但目前還混有三類不可信輸出：一是 server log route 在 ESM runtime 下有失效風險；二是 diagnostics action 雖然安全，卻只回傳重新包裝的 summary 文字，缺少真正可解釋的 server-side 動作語意；三是前端 telemetry 卡片仍有硬編碼數值。這些問題不一定都會讓頁面 crash，但會讓 operator 失去對整個頁面的信任。

## Goals / Non-Goals

**Goals**

- 讓 `Device Status` 只顯示可被信任的 telemetry、diagnostics 與 log access。
- 保持 diagnostics 的安全讀取/刷新邊界，但讓輸出與行為語意一致。
- 讓 log listing / export 在現有 ESM server runtime 下可用。
- 補上對應 regression tests。

**Non-Goals**

- 不新增危險 device control。
- 不導入新的外部 observability 基礎設施。
- 不把 `Device Status` 改造成完整日誌瀏覽器。

## Decisions

### Keep device diagnostics bounded but truthful

`Device Status` 的 diagnostics action 仍維持 safe read / refresh / export 範圍，但 action label、server 行為、回傳 payload 必須一一對齊。前端不得再把任何成功訊息包裝成像「執行了診斷」但實際只是重新讀同一份 summary。

### Replace placeholder telemetry with measured or unavailable values

前端 telemetry cards 只允許兩種資料來源：真實量測值，或明確 unavailable / unsupported 狀態。硬編碼數值會直接破壞 operator trust，因此必須移除。

### Make device log access ESM-safe

`/api/device/logs` 與 `/api/device/logs/export` 必須在現有 Node ESM server runtime 下穩定可用，避免路由本身因 module API 使用錯誤而在真正打到時才失效。

## Implementation Contract

- Behavior: `Device Status` SHALL 顯示真實 telemetry 或 unavailable 狀態；diagnostics action SHALL 回傳可解釋的安全 server-side 結果；log routes SHALL 在現有 server runtime 下可讀取近期 logs 或 export metadata。
- Interface / data shape: device diagnostics response SHALL 明確描述 action、generatedAt 與對應 summary；device status telemetry payload SHALL 不依賴前端硬編碼數字；device log routes SHALL 維持現有安全只讀 envelope。
- Failure modes: 若 telemetry 無法取得，UI MUST 顯示 unavailable，而不是沿用假值；若 log 目錄不存在或讀取失敗，API MUST 回傳現有 error envelope，而不是 runtime exception；若 diagnostics 無法完成，前端 MUST 顯示 error feedback。
- Acceptance criteria: `apps/server/src/routes/device*.test.ts` 與 `apps/web/src/pages/DeviceStatus/viewModel.test.ts` SHALL 覆蓋 ESM-safe log access、truthful diagnostic payload、telemetry unavailable state 與 success/error feedback。
- Scope boundaries: 本 change 只處理可信輸出與安全 diagnostics，不擴成新的 device control 或 full-text log browser。

## Risks / Trade-offs

- [Risk] unavailable state 太常出現，讓頁面資訊看起來變少 → Mitigation: 明確區分 unsupported、not yet available、以及真實失敗訊息。
- [Risk] diagnostics 若改成更真實的結果會暴露太多內部細節 → Mitigation: 仍維持安全摘要輸出，不外洩敏感 runtime 細節。
- [Risk] log route 修正後可能暴露目錄不存在等實際環境問題 → Mitigation: 保留既有安全 envelope，讓 operator 看到可處理的錯誤狀態。
