# 效能量測基線

- 第一案已完成 review/fix/verify/witness、使用者接受限定範圍、archive，並精準提交為 8fa2ec5976b5f6e3cbbda7f548277b8b96354f12。對應交接在 openspec/changes/archive/2026-09-12-fix-ui-draft-and-interaction-consistency/。
- Task 1.1 時 tracked source diff 為空；新檔只有本案 fixture/schema checks 與規劃 artifacts。本案將在 task 1.2 保存相同 instrumentation/harness patch 與五次 raw baseline，再開始 optimization。
- 身分資料：baseline-identity.json，包含 source tree、lockfile、fixture source / resolved fixture hashes、Node/pnpm/Playwright/CPU/memory/OS。正式 browser version 在 browser report 記錄。
- Fixtures：tests/browser/fixtures/ui-performance.ts。100 / 1000 張素材使用 ImageAsset 型別及既有 image library model；100 個 synthetic region 只供 mounted/fake-RAF，以真實 overlay resolver 確認幾何有效。Browser editor 使用既有合法 Overview template，不把合成 region 寫入 schema，量測報告記錄實際可編輯 region 數。
- Fixture 檢查 PASS：uiPerformanceFixtures.test.ts 2/2；web TypeScript PASS。此步是既有資料契約的 schema/read-back，沒有改產品行為，也沒有聲稱 RED 或效能提升。

## 現行成本與資源契約

- runtime.tsx 的 loadDisplayPagesEditorRoute 先 await registry，再 await selected-page draft。assets 接著 await image management model，再 await asset health；shell 接著 await shell draft/images。route return 發生在這些等待後。
- image model 的 images/storage/playlist 三個請求本身是 Promise.all；保留這個內部契約，不把它誤稱成三段串行。image model cache 可在相同 session 重用。
- displayEditorProfiler 目前有 region-resolve / overlay-resolve 的 Performance measures 與 preview React profiler；前後量測要用同一個擴充版本，production React Profiler 不保證提供 commit timings，需使用同樣的 opt-in scope/計數接點。
- canvasOverlayState 目前每次 feedback 都產生 region frames/page guides；inspector overlay 對每個 region 查找 frame。AssetLibraryCard 已 memo，但 batch/delete callbacks 在 parent render 取得新 identity。
- Pointer release 維持最後 pointermove 的已解算結果；不新增 release coordinates 取樣。fake-RAF 必須另保留 move x=100 / up x=120 的相同完整事件序列比較。

## 量測條件

- cold：fresh browser context、空的 session/module data cache；warm：同一 context 完整進入目標 workspace 後往返，再執行同一操作。兩者分開保留，每條件五次。
- Editor/assets/shell navigation 各量 navigation-to-frame、navigation-to-content、request count；獨立 diagnostic/unrelated resource delay 固定且記入 fixture 身分，不能只比較同名 URL 卻改延遲。
- Asset selection：100 / 1000 cards，A→B 及單一 batch toggle，記 card render count、時間、最終 markup/selected id；首屏 mount 與單選收益分開。
- Drag：100 synthetic regions、100 pointermove、10 fake-RAF callbacks、一次 release；另有 real browser Overview drag，記錄實際 regions 與 overlay measures。
- Baseline / candidate 使用相同硬體、browser、build mode、fixture、observability patch/harness。缺 baseline、樣本不齊、身分或行為不一致時回報不可比較。
- 既有 isolated browser:smoke 在 127.0.0.1:3310、temporary SQLite/uploads、mock MQTT。成功 artifacts 必須直接寫 runtime.artifactDir 再 attach，不能只依賴 runner 保留 Playwright output。
- 第一案已接受的 FHD 差距留待另案；本案只檢查成功狀態相容及新增 pending/error 操作，Pi/production 不在本機效能證明範圍。
