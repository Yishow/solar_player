# FHD Closeout Handoff — 2026-06-07

接續用：新對話可從這份開始，把剩餘 2 個 editor-capability change 做完。

## 已完成（this effort，~11 commits on `main`）

| Phase | 內容 | 狀態 |
| --- | --- | --- |
| 0 | Baseline 輸入對帳 | ✅ |
| 1 | Polish 4 頁（overview-solar / factory / images / sustainability）reference-quality-target | ✅ archived |
| 2 | Fresh witness（主 session 親自讀圖，run `polish-pass-1`）五頁 config-backed 目標 PASS | ✅ `fhd-playback-witness-polish-pass-1-2026-06-06.md` |
| 3 | Runtime 必備：brightness/orientation 套 viewport、4-up image seed、修既有 build 錯誤 | ✅ archived（`apply-playback-brightness-orientation-runtime`） |
| 4-a | Factory 電路線 PNG→可調 SVG（細線 #6f9b5a、平滑 bezier fan-out、editable strokeColor） | ✅ archived（`make-factory-circuit-routing-editable-svg`） |
| 5 | Phase 1-2 + runtime + factory-svg 已 archive | ✅ |

驗證基線：`pnpm --filter @solar-display/web test` 495 pass、`pnpm --filter @solar-display/server test` 228 pass、`pnpm run build` exit 0。

## 待辦（剩餘 Phase 4，proposal 已開、未實作）

兩個 active change（`spectra list`），各只有 proposal.md，需 `/spectra-propose` 補 design/spec/tasks 後 `/spectra-apply`：

### `extend-display-editor-ornament-and-media-controls`
- Hero media 飽和/對比（heroMedia 效果目前僅 opacity/blur）→ Overview/Sustainability hero 偏洗白。
- Solar gold line 基底 layout + 傾斜角、Solar/Sustainability leaf 基底 layout（目前 `index.tsx` hardcode）。
- Ring ornament thickness/glow、Images media stage 圓角/shadow/全出血 toggle、thumb 圓角。

### `extend-typography-palette-and-fix-ornament-bindings`
- 綠 palette tokens（value #57774a / icon #6a8a50 等 CSS custom props → config token）：整頁綠調比 reference 冷。
- copy-en 字級/文字欄位（Sustainability/Factory/Images，目前 CSS 寫死、無 editor text 欄位）。
- Factory/Images/Sustainability KPI/stat 字級。
- **Binding bug**：Factory leaf opacity（seed 0.38 vs 實測 1）、Sustainability leaf rotation（matrix identity vs CSS -28deg）。

### 其他已知缺口（非上述 change，視需要另開）
- Factory/Solar **node tile 綠飽和偏淡偏 generic**（CSS）：reference 節點更飽和有層次。屬上面 palette/ornament change 範疇或可另開小 change。
- Demo 資料：多頁顯示 `——`/「內容整理中」placeholder，使畫面不如 reference 飽滿（屬 seed/runtime data，非視覺 config）。

## 流程提醒
- `.spectra.yaml`：tdd/audit/parallel_tasks 皆 true，effort apply=xhigh。
- 每個 change：TDD（RED→GREEN）→ closeout doc → 更新 launch matrix（維持 blocked）→ graphify update . → spectra analyze/validate --strict → 小而可審 commit（`/spectra-commit`）。
- witness：`pnpm dev` 起 server+web → `pnpm run fhd:witness -- --base-url http://localhost:5173 --run-id <id>` → 讀 `docs/fhd-witness/runs/<id>/playback/*.png` 對照 `docs/reference/FHD/01-05`。
- 守 boundary：只動 reference-quality-target / 該 change 範疇；shared header/footer protected；actual-gap 不 hardcode；launch status 不誇大為 ready。

## 既有 pre-existing（非本 effort 造成）
- 未使用 import：`createMetricHighlightCard`（Sustainability/displayPageConfig.ts）、`React`（DisplayCanvas.tsx）。
- repo 仍有多個更早完成但未 archive 的 change（harden-management 等），與本 FHD effort 無關。
