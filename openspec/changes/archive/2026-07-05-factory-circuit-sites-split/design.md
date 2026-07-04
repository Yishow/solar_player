## Context

當前的 `/factory-circuit` 頁面在 Full HD 展示下只支援固定的 6 個用電項目。現在廠區需要分流為「中壢廠」與「觀音廠」，且觀音廠多了大車工程與ED電著，需要顯示 8 個用電項目，並依據實際工廠部門名稱進行重新對應。

## Goals / Non-Goals

**Goals:**
- 讓 `/factory-circuit` 支援中壢廠與觀音廠兩套獨立配置，中壢廠顯示 6 個工程（沖壓、車身、塗裝、裝配、原動力、事務系），觀音廠顯示 8 個工程（外加大車工程與ED電著）。
- 將迴路 Slot 機制由 6 個擴展為 8 個，自訂符合實際工程的命名。
- 實作 SVG 連接線的動態 Y 軸座標計算，使其能適應 6 條與 8 條等不同的行數排版。
- 在 SQLite 資料庫中註冊雙廠區的播放頁面。

**Non-Goals:**
- 不修改原有的 SQLite schema（`display_slot` 維持 TEXT 類型以容納新 key，不新增資料表欄位）。
- 不調整播放器前端的輪播過渡動畫核心邏輯。

## Decisions

### 決策一：在 Page Registry 註冊雙實例頁面，而非前端 page-local 切換
- **選擇**：利用現有的 `display_page_registry`，註冊兩個實例（中壢廠 pageKey 為 `factory-circuit`、觀音廠 pageKey 為 `factory-circuit-guanyin`），它們使用同一個範本 `factory-circuit`。
- **理由**：這能發揮編輯器 (Display Pages Editor) 的最大功用。兩個廠區頁面在資料庫中有獨立的 draft/live配置，包含獨立的文案、甚至各個 Row 的 absolute 坐標，管理者可以直接在編輯器中微調其擺放位置，不影響另一廠區。

### 決策二：重構與擴展全域的 Slot Keys
- **選擇**：將舊的 6 個 slot keys (`production`, `hvac` 等) 改為符合實際工廠的語意命名，並加入 2 個新 keys，總計 8 個：`stamping`, `body`, `painting`, `assembly`, `utility`, `office`, `heavy_vehicle`, `ed_coating`。
- **理由**：舊的命名（如 `ev`、`infrastructure`）與新要求的「大車工程」、「ED電著」等名稱不符。在實作時重構為具備高度語意的命名，利於後續的程式碼維護與 MQTT 資料流綁定。

### 決策三：動態 SVG 排線取代靜態 6 條路徑寫死
- **選擇**：計算每行渲染出的 row.top 與 row.height，得出相對 SVG 容器的 Y 座標，動態組成 `<path d="..." />` 與 `<circle />`。
- **理由**：原本 6 條 path 是完全在 JSX 內寫死坐標的。觀音廠有 8 條，且中壢廠 6 條與觀音廠 8 條的 Row 高度及間距不同。如果不做動態計算，線條一定會錯位，造成穿幫。動態排線可一勞永逸地解決多行數、不同間距下的連線視覺完整度。

## Implementation Contract

### 1. 介面與資料結構：
- `DisplayCircuitSlotKey` 新增至 8 個：`stamping | body | painting | assembly | utility | office | heavy_vehicle | ed_coating`。
- 新增兩個 MQTT Topic 與 MetricKey 對應：
  - `factoryCompressorPower` -> `factory/power/utility` (原動力對應 topic 可用 utility，若為空壓機則為 `factory/power/compressor`)
  - `factoryHeavyVehiclePower` -> `factory/power/heavy_vehicle` (大車)
  - `factoryEdCoatingPower` -> `factory/power/ed_coating` (ED電著)

### 2. 中壢廠與觀音廠配置細節：
- 中壢廠 (`factory-circuit` / `/factory-circuit`)：
  - `loadRowStates` 預設：`heavy_vehicle.visible: false`，`ed_coating.visible: false`，其餘 6 個 visible 為 true。
  - 座標高度為 84px，間距步長 95px。
- 觀音廠 (`factory-circuit-guanyin` / `/factory-circuit-guanyin`)：
  - `loadRowStates` 預設：所有 8 個 visible 皆為 true。
  - 座標高度為 65px，間距步長 74px。

### 3. 驗證條件：
- 執行 `pnpm run test`（或相關 backend/frontend 測試）綠燈。
- 使用 `pnpm run fhd:witness` 對 `/factory-circuit` 和 `/factory-circuit-guanyin` 產生的截圖與 FHD 對齊，確認排線完美貼合卡片，無任何線路懸空或穿幫。

## Risks / Trade-offs

- **[Risk]** 重構 Slot Keys 會使舊資料庫中以 `production` 命名的 `display_slot` 無法對應。
  - **[Mitigation]** 在 `seed.ts` 初始化或 migration 中，加上資料庫修正 SQL，自動將舊 database 中的 `production` 等 display_slot 欄位值遷移至新 key 名稱。
