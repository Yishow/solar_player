# UI 載入與渲染效能最佳化 FHD Witness 與 Evidence Bundle

## Run Summary

- Change：`optimize-ui-loading-and-render-work`。
- timestamp / run id：`ui-consistency-2026-09-12T13-17-58-756Z-2gyhb4`，capture generated at `2026-09-12T13:18:08.457Z`。
- live route URL：隔離測試服務 `http://127.0.0.1:3310`；各 route 見下表。
- viewport：全部 21 張 PNG 均已確認尺寸為 1920×1080（15 張 FHD、6 張管理頁操作結果）。
- visual canonicals：`docs/reference/FHD/` 對應 PNG。主代理已核對五張 playback reference、15 張 FHD 及 6 張管理頁 screenshot。
- source identity：基於上一案完成後乾淨 baseline，本次 source diff 集中於效能優化；本批 capture 於整合 gate `pnpm verify` 通過後執行。
- editor capability classification：逐列記錄；既有版面差距維持前案共識，本次工作區載入分流、拖曳 rAF 合併與卡片 memo 未改變任何既有 FHD 播放輸出或 editor 設定。
- human acceptance status：**pending human review**。FHD 版面與操作 intentional differences 依制度交由使用者決定 acceptance。

## 執行與環境

於完整 `pnpm verify` 全部 PASS（包含 build、bundle-budget、shared、server、web、deploy、server-runner）後執行：

```sh
rtk proxy env VITE_HIDDEN_MANAGEMENT_ROUTES=/history UI_INTERACTIONS_FHD_WITNESS=1 BROWSER_SMOKE_KEEP_SUCCESS_ARTIFACTS=1 BROWSER_SMOKE_GREP=ui-interactions pnpm run browser:smoke
```

- PASS：7/7 browser cases，exit 0（耗時 28.4s）；包含六個管理與互動操作測試及一個官方 FHD witness capture case。
- Runner 使用暫存 SQLite / uploads 與 mock MQTT；測試結束已自動清理隔離 runtime。無正式 broker、實體 Pi 或部署操作。
- FHD case 於隔離服務準備並發布 playback profile，建立 CL / KN 測試裝置及配對 context，再調用 `node scripts/capture-fhd-witness.mjs -- --base-url http://127.0.0.1:3310 --run-id ui-consistency-2026-09-12T13-17-58-756Z-2gyhb4`。
- Raw results：`artifacts/browser-smoke/2026-09-12T13-17-58-756Z-2gyhb4/ui-interactions-results.json`；capture output：同目錄 `fhd-witness-output.txt`。

## Playback Witness Rows

截圖路徑相對 `docs/fhd-witness/runs/ui-consistency-2026-09-12T13-17-58-756Z-2gyhb4/`；每列 viewport 均為 1920×1080。

| route key | live route URL | reference image | current screenshot | viewport | editor capability classification | remaining gap notes | human acceptance status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| overview | `/overview` | `docs/reference/FHD/01-1.Overview (大).png` | `playback/overview.png` | 1920×1080 | existing-editor-control / non-editor-runtime-gap | Hero、五張 KPI 及下方四卡列完整呈現；未因效能優化產生版面位移或渲染退步。既有長數字裁切與 mock 狀態維持前案。 | pending human review |
| solar | `/solar` | `docs/reference/FHD/02-2.Solar (大).png` | `playback/solar.png` | 1920×1080 | existing-editor-control / non-editor-runtime-gap | 流程節點與連線完整渲染。雙語 lead 換行與長數字裁切維持前案既有差距，無效能改動引入的新退步。 | pending human review |
| factory-circuit | `/factory-circuit` | `docs/reference/FHD/03-3.Factory Circuit (大).png` | `playback/factory-circuit.png` | 1920×1080 | existing-editor-control / non-editor-runtime-gap | Diagram-first 結構、六筆負載與連線正常顯示。fixture 負載警示為測試條件；版面與前案一致。 | pending human review |
| factory-circuit-guanyin | `/factory-circuit-guanyin` | `docs/reference/FHD/03-3.Factory Circuit (大).png` | `playback/factory-circuit-guanyin.png` | 1920×1080 | non-editor-runtime-gap | 八筆觀音負載正常渲染。缺少 KN live inputs 顯示待同步，版面幾何保持穩定。 | pending human review |
| images | `/images` | `docs/reference/FHD/04-4.Images (大).png` | `playback/images.png` | 1920×1080 | existing-editor-control / non-editor-runtime-gap | 主圖、縮圖列與控制箭頭正常顯示。主圖素材既有文字殘影維持前案狀態，無結構退步。 | pending human review |
| sustainability | `/sustainability` | `docs/reference/FHD/05-5.Sustainability (大).png` | `playback/sustainability.png` | 1920×1080 | existing-editor-control / non-editor-runtime-gap | Hero、環形裝飾與重點卡正常渲染。intro 與重點卡重疊為前案既有差距，渲染未受影響。 | pending human review |

## Editor Preview Rows

| route key | live route URL | current screenshot | viewport | purpose |
| --- | --- | --- | --- | --- |
| overview | `/display-pages/editor?page=overview` | `editor/overview-editor.png` | 1920×1080 | 工作區載入分流後，Editor Toolbar 正常顯示草稿同步、區域樹與 preview；載入流暢無白屏。 |
| solar | `/display-pages/editor?page=solar` | `editor/solar-editor.png` | 1920×1080 | 草稿同步正常、Hero/flow 區域可見；拖曳 rAF 合併與 session 重用不影響 preview 呈現。 |
| factory-circuit | `/display-pages/editor?page=factory-circuit` | `editor/factory-circuit-editor.png` | 1920×1080 | 六負載 preview 正常呈現，草稿同步與 toolbar 操作正常。 |
| factory-circuit-guanyin | `/display-pages/editor?page=factory-circuit-guanyin` | `editor/factory-circuit-guanyin-editor.png` | 1920×1080 | 觀音八負載 preview 正常呈現，頁籤切換狀態正確。 |
| images | `/display-pages/editor?page=images` | `editor/images-editor.png` | 1920×1080 | 素材庫整合、主畫面/資訊面板預覽正常，AssetLibraryCard memo 不破壞 editor 選圖流程。 |
| sustainability | `/display-pages/editor?page=sustainability` | `editor/sustainability-editor.png` | 1920×1080 | 主視覺、重點卡列、Ring 區域正常呈現，草稿狀態穩定。 |

## Site Context Witnesses

| site | route key | live route URL | current screenshot | purpose / remaining gap notes | human acceptance status |
| --- | --- | --- | --- | --- | --- |
| kn | overview | `/overview` | `playback/site-context/kn-overview.png` | 以 paired KN context 正常載入；無效能改動破壞 site context 傳遞。 | pending human review |
| kn | solar | `/solar` | `playback/site-context/kn-solar.png` | 以 paired KN context 正常載入；流程圖保持正常。 | pending human review |
| kn | sustainability | `/sustainability` | `playback/site-context/kn-sustainability.png` | 以 paired KN context 正常載入；呈現一致。 | pending human review |

## 效能與版面等價性核對

1. **DOM 與輸出等價性**：
   - 工作區載入分流：`ManagementRouteState` 僅在延遲資料抵達前提供非空白回饋，抵達後之 DOM 階層與既有 Editor / Asset Library 完全一致。
   - 拖曳 rAF 合併：`useDisplayEditorCanvasWorkflow` 在拖曳過程中以 rAF 合併 feedback，release 時精準 commit 最後合法座標，幾何輸出與 baseline 完全一致。
   - 素材卡片 memo：`AssetLibraryCard` 抽取為獨立元件並保留完整的 DOM 標記、樣式 class、lazy image 屬性及鍵盤/無障礙語意，輸出與 baseline 完全等價。
2. **無未授權的架構改動**：
   - 未引入清單虛擬化（virtualization）。
   - 未引入外部或全域 state store（Redux/Zustand 等）。
   - 未改動 FHD 播放頁的視覺版面與 CSS。
   - 未重寫伺服器 API 或 SQLite / MQTT 資料庫模型。
3. **驗收邊界**：
   - 本批次為隔離 fixture runtime 測試結果，未在真實 Pi 5 或生產環境進行現場觀測。
   - 既有版面差距與 intentional differences 維持交由使用者人工決定 acceptance。
