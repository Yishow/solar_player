## Context

目前 CO2 卡片在 `Overview`、`Solar` 與其他共用 monitoring story 的頁面上，都是先以噸 (`t`) 為計算與顯示基準，再由 shared formatting 規則輸出字串。這讓 `0.01 t` 這類小量值雖然計算正確，但現場可讀性很差。現有需求是補一個可持久化的全域顯示偏好，讓管理端可決定是否把 `< 1 t` 的 CO2 值改以 `kg` 顯示，同時維持資料模型、計算公式與 runtime story 基礎語意不變。

此變更橫跨 SQLite migration、server calculation settings、shared formatter、以及管理頁 checkbox，因此需要先固定資料邊界與顯示落點，避免實作時把「顯示偏好」誤做成「單位語意變更」。

## Goals / Non-Goals

**Goals:**

- 在全域 calculation settings 持久化一個 CO2 小數值顯示偏好
- 讓 `/settings/data-source` 可讀寫此偏好，並在儲存後同步到 runtime 顯示
- 當偏好開啟時，將原始單位為 `t` 且 `0 < abs(value) < 1` 的 CO2 顯示改為 `kg`
- 保持 `Overview`、`Solar` 與其他共用 monitoring story 顯示路徑的一致性
- 關閉偏好時維持現有 `t` 顯示，不造成現場畫面自動漂移

**Non-Goals:**

- 不修改 CO2 計算公式、MQTT topic mapping、或資料庫中 CO2 數值的基礎單位
- 不讓非 CO2 指標套用這個自動轉換規則
- 不為單一頁面增加 page-local override
- 不修改匯出、歷史彙總、或其他非 runtime 顯示資料流

## Decisions

### Persist the preference alongside calculation settings

將偏好新增到既有 `calculation_settings`，而不是放在 browser local state 或 page config。原因是這是管理端要求的全域運營偏好，必須在 kiosk、其他管理端與重整後保持一致。這也讓現有 `/api/calculation-settings` 與 `DataSourceSettings` 可以沿用同一條讀寫路徑。

替代方案：
- 僅存在瀏覽器 local storage：實作較小，但跨裝置不一致，且不符合全域需求。
- 放進 display page config：會把單位顯示偏好錯誤地綁成 page-local authoring 設定，與需求不符。

### Apply the conversion at the display formatting layer, not the calculation layer

CO2 計算仍維持以 `t` 為 story 的基礎數值與基礎單位。只有在產生供 UI 顯示的 `value` 與 `unit` 時，才依偏好決定是否把 `< 1 t` 轉成 `kg`。這樣可以避免改動 CO2 導出邏輯、counter 語意與比較邏輯，也能確保關閉偏好時完全回到既有顯示。

替代方案：
- 直接把 story 內 CO2 基礎數值改成動態 `kg/t`：會污染資料語意，讓後續比較、匯出與其他 consumer 更難推理。
- 僅在各頁 view model 做條件轉換：會讓 `Overview`、`Solar` 與其他頁面各自分叉，增加 drift 風險。

### Keep the scope to shared monitoring story consumers

第一版只處理目前直接使用 monitoring story 顯示 CO2 的 runtime 路徑，至少包含 `Overview`、`Solar`，以及共用 formatter 的其他相同資料流 consumer。這比逐頁分別 patch 更穩定，也符合「全域」設定語意。

替代方案：
- 只改 `Overview`：最小但不符合全域設定，也會讓 `Solar` 與其他頁面數值表達不一致。

## Implementation Contract

### Observable behavior

- 管理端在 `/settings/data-source` 看到一個新的 checkbox，可控制「`< 1 t` 的 CO2 自動改以 `kg` 顯示」
- checkbox 預設為未勾選 (`false`)
- 當 checkbox 未勾選時，CO2 卡片維持目前的 `t` 顯示
- 當 checkbox 勾選並儲存後，共用 monitoring story 的 CO2 顯示會套用下列規則：
  - 原始 CO2 單位為 `t`
  - 且 `0 < abs(value) < 1`
  - 則 UI 顯示改為 `kg`
  - `kg` 數值等於 `t * 1000`
- `0 t` 仍顯示 `0 t`
- `1 t` 以上仍顯示 `t`
- `--` fallback 維持 `--`

### Interface / data shape

- `CalculationSettings` 物件新增一個布林欄位：`co2AutoConvertSmallToKg`
- `/api/calculation-settings` 的 GET 與 PUT 回應/請求都包含此欄位
- SQLite `calculation_settings` 新增對應欄位，migration 預設值為 `0` / false
- shared display formatting 需能在既有 numeric value + unit + preference 的輸入下，輸出最終要顯示的 `value` 與 `unit`

### Failure modes and fallback

- 若舊資料庫尚未有此欄位，migration 必須補上並套用預設 false，不得讓現有 calculation settings 讀取失敗
- 若 checkbox 值缺失或非布林，不得造成 settings 寫入 silent corruption；server 應以既有 validation discipline 處理
- 若 runtime 指標本來就沒有數值（`--`）或不是 `t`，不得硬套 `kg` 轉換

### Acceptance criteria

- migration / service / route tests 證明新偏好可讀取、儲存、重載後保留
- shared formatter tests 證明 `off/on`、`0`、`<1 t`、`>=1 t`、fallback 都符合規則
- `Overview` / `Solar` 測試證明相同 story 在偏好開啟時會顯示 `kg`，關閉時維持 `t`
- `spectra analyze add-global-small-co2-display-toggle --json` 與相關測試通過

### Scope boundaries

- 本 change 僅調整顯示輸出，不重新定義 CO2 原始單位語意
- 本 change 不要求處理所有歷史頁面或匯出頁面，只處理本次共用 monitoring story 的 runtime 顯示鏈
- 本 change 不新增額外 page-local override 或 second-level formatting preferences

## Risks / Trade-offs

- [Risk] 共用 formatter 改動可能影響超出 `Overview` / `Solar` 的 CO2 顯示 consumer → Mitigation: 只在 unit=`t` 且明確標記為 CO2 display path 的地方套用，並補 shared + page tests
- [Risk] 將偏好併入 calculation settings 會擴大該設定物件的責任 → Mitigation: 明確將其描述為全域換算/顯示偏好的一部分，避免另開不必要的設定 API
- [Risk] 現場可能期待 `0.495 t` 顯示 `495.0 kg` 而非 `495 kg` → Mitigation: 先以現有 shared formatting 規則定義 `kg` 小數位，並用測試固定；如需再調整另開 change
