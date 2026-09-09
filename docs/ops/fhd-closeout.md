# FHD / Display Closeout 守則

> 讀者：任何要碰 playback 頁、shared display chrome、`/display-pages/editor` 或其他 FHD surface 的 agent。
> 視覺基準：`docs/reference/FHD/` 的 14 張 PNG。prototype HTML（`docs/FHD.01.html`、`docs/reference/kuozui-green-fhd-html-prototype/`）**只是歷史參考，不是 source of truth**。

## 現況判讀（2026-07-03）

- 14 條 route 都已有 React implementation；缺口是 FHD 品質收尾，不是 prototype 移植。
- 尚未 launch-ready；五個 playback 頁仍需要新鮮的 authoring/runtime/publish/fallback/handoff witness。
- 100% 的主要缺口：FHD polish、editor capability、runtime parity、fallback/publish refresh、evidence bundle、交接紀錄。

## 單頁 closeout 標準流程（唯一的執行順序；本檔其餘清單是原則與檢查點，不是另一套順序）

1. 對照 `docs/reference/FHD/` 對應頁 PNG，寫下這次要收斂的具體差距。
2. 讀現行 route/component/config：`apps/web/src/pages/<Page>/`、`apps/web/src/pages/DisplayPagesEditor/`、`apps/web/src/pages/shared/`。
3. 查對應 `openspec/specs/` 或 `openspec/changes/`，確認這次是 polish、runtime parity、fallback、publish refresh，還是工具鏈/asset pipeline。
4. **Editor capability 檢查**：這個差距能否由 `/display-pages/editor` 表達？不能 → 先補 editor capability gap（見下方原則），再回來。
5. 實作：page-local 程式碼只承接 editor config 到 runtime primitive，不 hardcode。
6. 驗證：targeted tests + fresh witness（gap notes + evidence bundle，見下節）；結果寫進本次 change artifact 或回報，不把 root docs 當逐頁 QA ledger。
7. 差異是否 intentional、是否達 launch 品質 → 交使用者判定。

## Witness workflow（驗收的唯一有效形式）

- 入口文件：`docs/reference-match/fhd-workflow-entrypoints.md`（vocabulary：witness batch、evidence bundle、visual canonicals、launch witness gates）；`docs/fhd-witness/playback-closeout-matrix.md` 與 `docs/fhd-witness/evidence-template.md`。
- 執行：root 跑 `pnpm run fhd:witness -- --base-url <url>`，依 `scripts/fhd-witness-config.mjs` 的 playback routes 與 editor preview states 擷取 1920x1080 screenshot/evidence。
- 這個 workflow **沒有 pixel threshold gate**：AI 負責 capture、gap notes、Spectra hygiene；intentional difference 與 launch acceptance 由使用者人工判定。
- 「完成」的證據 = 按 evidence-template 填好的 evidence bundle。只有截圖沒有 gap notes，或只有「跑過 witness」一句話，都不算完成。
- evidence bundle 一律用 `docs/fhd-witness/evidence-template.md` 這一份模板；repo 內其他相似模板（如 `docs/reference-match/fhd-evidence-bundle-template.md`）以本條為準，不要用。

## Editor capability-first（優先序不可倒）

1. 五個 playback 頁的 FHD closeout 都先確認能否由 `/display-pages/editor` 維護。
2. FHD 差距無法由 editor 表達 → 先定義成 editor capability gap：補 shared schema、inspector control、draft/live persistence、preview/runtime renderer、seed fallback、validation/reset 與 targeted tests。
3. Page-local changes 只能用來承接 editor config 到 page-specific runtime primitive；**不要用 page-local hardcode 繞過 editor**。

## Playback 五頁 closeout 方向

- `/overview`：hero photo fade、雙語 title/eyebrow/lead 的 line-height、底部五張 KPI 卡高度與間距。
- `/solar`：connector 粗細、flow node 絕對座標、流程圖與 KPI row 的垂直節奏。
- `/factory-circuit`：電路線條粗細、`DisplayLeafOrnament` opacity/scale、load panel 從屬性，避免變成管理表格。
- `/images`：media stage 裁切比例、thumbnail strip 密度、caption card 字級與展示張力。
- `/sustainability`：ring ornament 與 hero media 疊合、Trees/stat card 節奏、highlight rail 密度。

## 防止 management-surface drift（違反任一條 = 方向錯了，停下）

- Playback 頁不可因共用 component 或 style cleanup 退回 settings-like glass cards、toolbar stack、table-first panels。
- Flow/circuit/icon 類元素維持 source-like visual language，不可被 generic management glyph 取代。
- 不為了 FHD polish 改 root monorepo、route shell、server API、SQLite/MQTT 架構。
- 不順手重寫 shell、route、API 或資料模型。

## 100% 收斂順序

1. **Baseline freeze**：先用 browser/manual witness 跑五個 playback 頁，取得真實 pass/fail/blocker，不靠舊 checklist 推論。
2. **Editor capability pass**：逐頁確認 FHD 差距能否由 editor 表達；不能就先規劃 editor schema/inspector/runtime 擴充。
3. **Playback closeout**：依五頁方向逐頁處理，change artifact 留 protected attributes 與例外。
4. **Management closeout**：`/trends`、settings、history、offline、slideshow preview、device status 的 FHD density 與互動回歸；保留既有 API、draft、save/test/CRUD 行為。
5. **Tooling / assets**：Playwright visual regression 另拆 Spectra change 評估；asset pipeline 優先補四個非 Solar playback 頁的 manifest，不混入 UI polish。
6. **Handoff**：Spectra validation/archive、測試與 witness 摘要，小而可審的 changes。

## AI-led execution 邊界

- 允許 AI 主導：盤點現況、拆 Spectra change、改程式、跑驗證、更新 handoff。
- 使用者保留：產品意圖、FHD 品質門檻、tradeoff 是否接受、intentional difference、launch acceptance。
- 「AI 主導」不是擴架構、跳過 witness、省略驗證的理由。
