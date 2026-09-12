# UI 一致性 Browser / FHD 證據

## Run Summary

- Change：`fix-ui-draft-and-interaction-consistency`。
- timestamp / run id：`ui-consistency-2026-09-12T07-30-08-343Z-7yi84h`，capture generated at `2026-09-12T07:30:17.748Z`。
- live route URL：隔離服務 `http://127.0.0.1:3310`；各 route 見下表。
- viewport：全部 21 張 PNG 均已讀取尺寸確認為 1920×1080；15 張 FHD、6 張管理頁操作結果。
- visual canonicals：`docs/reference/FHD/` 對應 PNG。主代理已逐張檢視五張 playback reference、15 張 FHD 及 6 張管理頁 screenshot。
- source identity：`e13f918d28b5f5eac21d10232fe6084700873aad704053c4ceea4277cb398f15`，41 個 source/test hashes 與 lockfile 於 capture 後核對未變；見 `source-identity.json`。
- current screenshot / hashes：見 `witness-manifest.json`；本文件依 `docs/fhd-witness/evidence-template.md` 保留必要欄位。
- editor capability classification：逐列記錄；畫面差距已獲准留待另案，未判為正式 FHD 品質已接受的 intentional-difference。
- human acceptance status：**accepted for this change**。2026-09-12 使用者回覆「接受本案，畫面差距留待另案」；接受互動修正及將下列差距留待獨立改善，未宣稱差距已修好或達 launch 品質。

## 執行與環境

最後完整 `pnpm verify` 通過後執行：

```sh
rtk proxy env VITE_HIDDEN_MANAGEMENT_ROUTES=/history UI_INTERACTIONS_FHD_WITNESS=1 BROWSER_SMOKE_KEEP_SUCCESS_ARTIFACTS=1 BROWSER_SMOKE_GREP=ui-interactions pnpm run browser:smoke
```

- PASS：7/7 browser cases，exit 0；六個操作測試加一個 official FHD capture case。
- Runner 使用 temporary SQLite / uploads 與 mock MQTT；結束已清除隔離 runtime。沒有正式 broker、實體裝置或部署操作。
- `/trends` 平時隱藏；本次用 `VITE_HIDDEN_MANAGEMENT_ROUTES=/history` 的隔離 build 開放 `/trends`，產品預設 route gate 未修改。完整 `pnpm verify` 使用產品預設 build。下一次一般啟動應依原本環境重新 build，勿把 witness dist 當部署產物。
- FHD case 在隔離服務準備並發布 playback profile，建立 CL / KN 測試裝置及配對 context，再執行 `pnpm run fhd:witness -- --base-url http://127.0.0.1:3310 --run-id ui-consistency-2026-09-12T07-30-08-343Z-7yi84h`。暫時 pairing URL 不納入報告。
- 實際操作斷言及 fixture：`tests/browser/ui-interactions.spec.ts`。Raw results：`artifacts/browser-smoke/2026-09-12T07-30-08-343Z-7yi84h/ui-interactions-results.json`；capture output：同目錄 `fhd-witness-output.txt`。
- 六個操作 page 的 `pageerror` 為空。FHD 子程序沒有在這份 JSON 收集 pageerror，不能據此宣稱子程序 console 全無錯誤。
- mock metric 隨時間變動；CL 含大額累計數字，KN fixture 缺少 live inputs。畫面可用於檢查 fallback 與布局，不能證明正式廠區資料正確。本批不是固定時鐘的 pixel-equivalence baseline。

## Playback Witness Rows

下表 screenshot 路徑相對 `docs/fhd-witness/runs/ui-consistency-2026-09-12T07-30-08-343Z-7yi84h/`；每列 viewport 均為 1920×1080，timestamp / run id 同 Run Summary。

| route key | live route URL | reference image | current screenshot | viewport | timestamp / run id | editor capability classification | remaining gap notes | human acceptance status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| overview | `/overview` | `docs/reference/FHD/01-1.Overview (大).png` | `playback/overview.png` | 1920×1080 | 本批 run id | existing-editor-control / non-editor-runtime-gap | Hero、五張 KPI 及reference 以外的下方天氣/用量/趨勢/警示列可見；下方四卡列與 reference 組成不同。長 CO₂ 數字與卡片附註有裁切。用量空態、mock/weather disabled 是此 fixture 條件。差距留待另案改善。 | 本案接受；差距留待另案 |
| solar | `/solar` | `docs/reference/FHD/02-2.Solar (大).png` | `playback/solar.png` | 1920×1080 | 本批 run id | existing-editor-control / non-editor-runtime-gap | 流程節點與連線可見。中英文 lead 接成同一行；底部長數字及 metadata 換行/裁切。需檢查文案排版及 KPI 數值容納，不能僅靠正常短數值截圖判斷。 | 本案接受；差距留待另案 |
| factory-circuit | `/factory-circuit` | `docs/reference/FHD/03-3.Factory Circuit (大).png` | `playback/factory-circuit.png` | 1920×1080 | 本批 run id | existing-editor-control / non-editor-runtime-gap | Diagram-first 結構、六筆負載及節點/線條可見。fixture 負載顯示警告/缺值，峰值資料不可用；自用電量長數值有裁切。 | 本案接受；差距留待另案 |
| factory-circuit-guanyin | `/factory-circuit-guanyin` | `docs/reference/FHD/03-3.Factory Circuit (大).png` | `playback/factory-circuit-guanyin.png` | 1920×1080 | 本批 run id | non-editor-runtime-gap | 八筆觀音負載可見。缺少 KN live inputs，顯示待同步、資料不可用及 fallback；不得把這批當 KN 實測值驗收。與六筆 reference 的內容差異留待後續 FHD/資料驗收。 | 本案接受；差距留待另案 |
| images | `/images` | `docs/reference/FHD/04-4.Images (大).png` | `playback/images.png` | 1920×1080 | 本批 run id | existing-editor-control / non-editor-runtime-gap | 主圖、四張 thumbnail、左右箭頭與輪播進度可見。主圖左側含明顯「像」文字殘影；需釐清素材及 crop，不能直接接受為正式展示素材。 | 本案接受；差距留待另案 |
| sustainability | `/sustainability` | `docs/reference/FHD/05-5.Sustainability (大).png` | `playback/sustainability.png` | 1920×1080 | 本批 run id | existing-editor-control / non-editor-runtime-gap | Hero/ring 與六張 KPI 可見。intro 下緣與兩張重點卡重疊；累積發電、CO₂、植樹等長數字被卡片裁切。 | 本案接受；差距留待另案 |

## Editor Preview Rows

| route key | live route URL | current screenshot | viewport | purpose |
| --- | --- | --- | --- | --- |
| overview | `/display-pages/editor?page=overview` | `editor/overview-editor.png` | 1920×1080 | Toolbar 顯示草稿已同步、區域樹與 preview 已載入；可見主視覺/摘要卡/Bottom Widgets 控制責任。 |
| solar | `/display-pages/editor?page=solar` | `editor/solar-editor.png` | 1920×1080 | 草稿已同步、Hero/flow 區域可見；preview 同樣顯示 lead 黏接。 |
| factory-circuit | `/display-pages/editor?page=factory-circuit` | `editor/factory-circuit-editor.png` | 1920×1080 | 草稿已同步、Hero/節點/狀態區域與六負載 preview 可見。 |
| factory-circuit-guanyin | `/display-pages/editor?page=factory-circuit-guanyin` | `editor/factory-circuit-guanyin-editor.png` | 1920×1080 | 正確頁籤選中、八負載 preview 可見；editor context 的名稱/數值不能代替 paired KN runtime context。 |
| images | `/display-pages/editor?page=images` | `editor/images-editor.png` | 1920×1080 | 草稿已同步；主畫面/資訊面板/箭頭區域可見，素材與 playback 當時畫面不同。 |
| sustainability | `/display-pages/editor?page=sustainability` | `editor/sustainability-editor.png` | 1920×1080 | 草稿已同步；主視覺、重點卡片列、Ring 區域可見；intro 與重點卡同樣重疊。 |

這六張是 1920×1080 editor surface，不是完整 preview 畫布截圖；viewport 下緣僅顯示部分畫布，不能用來證明底部內容已完整驗收。圖片/數值/連線狀態在 unpaired editor 與 paired runtime 不同；沒有在本批完成同 snapshot 的 publish/refresh/fallback parity 全流程。

## Site Context Witnesses

| site | route key | live route URL | current screenshot | purpose / remaining gap notes | human acceptance status |
| --- | --- | --- | --- | --- | --- |
| kn | overview | `/overview` | `playback/site-context/kn-overview.png` | 以 paired KN context 載入；KPI/趨勢缺值，畫面仍有顯示中壢的天氣卡，需另核對資料 context。 | 本案接受；差距留待另案 |
| kn | solar | `/solar` | `playback/site-context/kn-solar.png` | 以 paired KN context 載入，資料缺值；lead 黏接同樣可見。 | 本案接受；差距留待另案 |
| kn | sustainability | `/sustainability` | `playback/site-context/kn-sustainability.png` | 以 paired KN context 載入，資料缺值，重點卡未出現；不足以證明長數字情境正確。 | 本案接受；差距留待另案 |

## Browser 操作結果

截圖為測試結束時的畫面；互動生命週期的證據來自真實 browser 操作與斷言，不能只憑最後一張圖推論。

| 範圍 | 結果 | 已執行的檢查 | 額外畫面限制 |
| --- | --- | --- | --- |
| 共用選單 | PASS | Enter/Space、Home/End、提交、Escape/Tab 關閉及焦點 | 保留既有播放設定版型。 |
| Fleet 對話框 | PASS | 初始焦點、Tab/Shift+Tab、Escape、pending 不關閉、關閉還原 trigger | 最後圖中的 503 error 為刻意失敗 fixture。 |
| 播放設定儲存 | PASS | 按住 stepper 跨 650 ms、disabled、禁止排序/重新同步、第一請求失敗後仍等第二請求 settled | 最後圖的錯誤是刻意失敗 fixture，草稿值保留；兩 API 的原子性未修改。 |
| 草稿衝突重載 | PASS | cancel 保留 dirty/undo、失敗保留、成功清除 dirty 並替換遠端內容 | 最後截圖因 browser 操作捲動而不含全域 header。 |
| 殼層 dirty | PASS | 新增物件、素材往返、失敗保留、成功父子同步 | Workspace 上方摘要列與 preview 標題/物件 UUID 重疊，仍需另案版型改善；本案修正的是基線與狀態生命週期。 |
| 趨勢軸 | PASS | 各卡 kW/kWh/%/t 單位、100% domain、40% 座標、tick 與 SVG 誤差 < 0.5 px | ISO 標籤已縮短且未再溢出；兩點 fixture 的五個時間刻度會重複，資料來源/時間刻度採樣未重構。 |

## 接受範圍與交接限制

Editor 能力核對（主代理已回讀原始碼；下列責任檔案均不在本案 source diff）：

| 差距 | 現有控制項 / 分類 | 限制與後續責任 |
| --- | --- | --- |
| Solar 雙語 lead | `solar-hero-copy` 的 Subtitle Line 1/2、字級/行高；existing-editor-control / new-editor-capability | `Solar/index.tsx:244` 直接以 inline span 串接第二段；現有欄位不能明確指定雙語換行策略。正式改善應先定義可由 editor 維護的排版契約。 |
| Sustainability intro / 重點卡 | `sustainability-highlight-rail` 的 Top/Height 可移動重點卡；existing-editor-control / new-editor-capability | `Sustainability/layout.ts:13` 的 intro 位置固定；`displayPageConfig.ts:309` 的 hero-copy geometry 指向 heroMedia，沒有獨立 intro geometry。需要補足能力時應完整覆蓋 schema/inspector/draft-live/runtime/fallback/tests。 |
| KPI 長值 | 各 KPI geometry、`Value Font Size`；existing-editor-control / new-editor-capability | `shared/displayCardStyleConfig.ts:165` 可手動縮字，`components/displayPageCards.css:10` 仍會隱藏溢出；固定字級不足以保證任意長值可讀。自動容納應由共用 renderer 與可維護的顯示策略承接。 |
| Images 主圖文字 | `images-main-stage` 的 Fallback Source Mode、placement/geometry；existing-editor-control / non-editor-runtime-gap | `Images/index.tsx:246` 優先使用 playlist assetSource，調整 fallback 不必然替換目前素材。已看到 reference asset 本身含文案，但尚未證實本批「像」殘影的確切來源；需核對實際 playlist asset/crop，不能把裁圖當作已修好素材。 |

以上 capability 判定是後續修正入口，不是已完成的 FHD 修正；Playback 表中的大分類應連同本表閱讀。

- 本案可交付的工程結果：草稿/儲存保護、共用控制項生命週期、父子殼層基線及趨勢數值座標一致性。驗證明細見 `verification.md`。
- 本案明列 Non-Goals 包含播放頁 FHD polish、管理頁響應式、圖表資料來源修正。上列視覺/素材/資料差距保留為後續責任，使用者已接受將差距留待另案；不將此決定擴張為正式展示品質 acceptance。
- 沒有本案修改前的同 fixture 新鮮 capture，所以不宣稱 pixel-equivalence，也不僅靠 source diff 宣稱每項畫面差距已證實是舊問題。
- 本批沒有實體 Pi / 正式 MQTT / LAN / 部署 / 人工觀看證據；`docs/fhd-witness/playback-closeout-matrix.md` 與 launch witness gates 的未完成狀態不變。
- 使用者已於 2026-09-12 明確接受本案限定範圍並將所列畫面差距留待另案；task 5.4 的必要 acceptance 已取得。沿原授權完成 archive、commit，再進入效能案。正式 FHD launch acceptance 仍未取得。
