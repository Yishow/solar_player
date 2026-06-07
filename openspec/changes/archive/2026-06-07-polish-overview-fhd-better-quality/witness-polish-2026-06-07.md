# Overview FHD Better Quality Polish — Witness 2026-06-07

擷取：dev server，agent-browser 1920x1080，`/tmp/solar_witness/overview-polished.png`。
對照：`docs/reference/Better/01.Overivew (大).png`。

## 完成項

1. **滿版節奏重排**：hero 帶（top 176, h466，底 642）、density widget 列（top 662, h196，底 858）、KPI 卡列（top 874, h188，底 1062）三段垂直不重疊，由 layout.test.ts 座標斷言驗證。
2. **Frosted glass 做成 editor 可調**：在 shared `DisplayCardStyleConfig` 新增 `surfaceOpacity`/`surfaceBlur`/`shadowStrength` 三欄位，吐 CSS 變數並暴露 inspector 控制；KPI 卡質感由此 editor-adjustable 路徑驅動（Overview seed 預設 opacity 0.66 / blur 16 / shadow 1.3）。其他四頁預設值維持 opaque 不變（行為不變）。
3. **資料排版精緻化**：KPI 卡 value/unit/label 字級與間距調整（valueFontSize 68→58 等）。
4. **Hero 重排**：title 字級 82→92、hero copy 上移收留白。

## ⚠️ 重要 canon 變更（已獲使用者明確授權）

- 本 change 重定義了 `displaySurfaceVisualGuardrails.test.ts` 標記為 **protected FHD geometry** 的 Overview hero fixture：
  - `heroCopyLayout`：`{86,210,600}` → `{86,196,620}`
  - `heroContainer`：`{690,540,182,1340}` → `{466,540,176,1340}`
- 原因：原 protected hero 高度 690 佔據上半至 y=872，與 Better 的「hero→widget 列→KPI 列」三段滿版節奏不相容。使用者選擇「重定義 protected hero 幾何」以換取三段不重疊的滿版版面。
- guardrail 測試已同步更新為新 canon 值。

## 誠實落差（未完全對齊 Better）

- hero 照片視覺重量仍小於 Better（照片區可再放大/增強張力）——本輪未動 hero media 來源與裁切。
- 天氣卡／三相表於本機 dev 為 fallback 態（無 weather/三相 MQTT 資料），看起來偏空；有資料時由單元測試證明正確。
- 整體質感較前一版明顯提升且架構正確（frosted glass = editor 可調），但與 Better 的成熟度仍有一截，主因在 hero 照片。

## 驗證
- `pnpm --filter @solar-display/web test`：521 passed。
- `pnpm run build`：通過。
- scope：僅動 Overview-scoped + shared card style schema（新增欄位，預設不改其他頁行為）；未碰 nav/route/server/SQLite/MQTT/共用 card component base。
