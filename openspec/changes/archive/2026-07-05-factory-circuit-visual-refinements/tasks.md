## 1. 後端與資料庫更新

- [x] 1.1 執行 "Guanyin Site Configuration Seeding" 需求。更新 `apps/server/src/db/seed.ts` 以支援 "registry & stage schema insertions" 決策，顯式為觀音廠 `factory-circuit-guanyin` 寫入配置。

## 2. 前端電力連線 SVG 美化與動畫

- [x] 2.1 執行 "Dynamic SVG Connector Layout Alignment" 需求。修改 `apps/web/src/pages/FactoryCircuit/index.tsx` 中的 SVG 畫布高度為 600px，並修改垂直總線起訖點為 `[minY + 16, maxY - 16]`，完全消除 16px 的超出線頭。驗證方式：確認畫線上不再有尖角超出，且觀音廠底部的 ED 電著能顯示連線。
- [x] 2.2 執行 "Vector SVG Connector and Flow Animation" 需求中的向量重構。移除對應太陽能、逆變器與開關板的 static PNG img 渲染，改為 inline vector `<svg>` 標籤，並將逆變器下墜線改為垂直直線。驗證方式：確認 PNG 引用被清除，頁面全為向量。
- [x] 2.3 執行 "Vector SVG Connector and Flow Animation" 需求中的 "flow animation css" 決策。在 `apps/web/src/pages/FactoryCircuit/factoryCircuit.css` 內新增 `.factory-circuit-flow-line` 發光與虛線流速動畫。驗證方式：看見線條實時綠光流動。

## 3. 播放設定頁滾動條修復

- [x] 3.1 執行 "Playback Settings Scrollable Containers" 需求。修改 `apps/web/src/pages/PlaybackSettings/playbackSettings.css` 裡的 `.ps-card-order .ps-card-content` 與 `.ps-card-duration .ps-card-content`，設定 height 與 `overflow-y: auto`，並加上自訂的綠色 webkit-scrollbar 樣式。驗證方式：確認輪播順序與停留秒數兩張 Card 皆能 scroll。

## 4. 負載列圖標與字型溢出修復

- [x] 4.1 執行 "High-Fidelity Load Row Icons and Copy Typography" 需求以支援 "preventing name overflow (compact layout)" 決策。在 `index.tsx` 中加入 `LOAD_ROW_SVG_ICONS` 圖標對應，並在 `factoryCircuit.css` 內加入當高度為 65px 時 compact 狀態下的 font-size 為 18px / 13px、gap 為 2px、icon 大小為 48px 的微調樣式。驗證方式：確認觀音廠區工程名完全包裹於卡片中，無任何垂直溢出。

## 5. 驗證與 witness

- [x] 5.1 執行 `pnpm test` 與單元測試，確保前後端所有單元測試全數綠燈通過。
- [x] 5.2 啟動伺服器並執行 `pnpm run fhd:witness` 重新產出截圖證據封包，確認截圖中的觀音廠具有 8 個工程且 SVG 線路無 any overhang，以及設定頁輪播順序與每頁停留秒數完美 scroll。
