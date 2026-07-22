# Sustainability Calculation Settings Runbook

這份 runbook 說明營運人員如何在管理介面調整永續換算係數，並確認它會影響哪些播放頁數字。

## 入口

- 管理頁路徑：`/settings/data-source`
- 區塊名稱：`換算係數`

這個區塊目前提供五個可編輯係數，儲存後會持久化到 server settings store，重新整理後仍保留。

## 預設值

- 排碳係數：`0.467` `kgCO2e / kWh`
- 植樹等效係數：`0.16` `trees / tCO2e`
- 每日家庭用電：`13` `kWh / day`
- 每月家庭用電：`400` `kWh / month`
- 估算電價：`4.5` `NTD / kWh`

若新環境尚未有設定列，系統會自動回落到以上預設值。

## 影響範圍

### 排碳係數

- 影響 `Overview` 的今日 / 累積減碳量卡。
- 影響 `Solar` 的今日 / 累積減碳量 KPI。
- 影響 `Sustainability` 的累積減碳量大數字。

換算公式：

```text
減碳量(t) = 發電量(kWh) × 排碳係數 ÷ 1000
```

系統現在以發電量推導減碳量，不再把 MQTT 的 `todayCo2Reduction`、`totalCo2Reduction` 或 `co2` 當成顯示來源。

### 植樹等效係數

- 影響 `Sustainability` 的植樹等效大數字。

換算公式：

```text
植樹等效 = 減碳量(t) × 植樹等效係數
```

### 每日 / 每月家庭用電與估算電價

- 影響 `Sustainability` 的四口之家等效卡。
- 今日卡使用「每日家庭用電」。
- 累積卡使用「每月家庭用電」。
- 卡片 disclaimer 會一起顯示目前使用中的每日 / 每月用電與估算電價。

## 儲存與驗證規則

- 五個欄位都必須是正數。
- `0`、負數、空值或非數字會被 API 拒絕，不會覆蓋既有設定。
- 儲存成功後，管理頁會顯示已儲存狀態，播放頁會透過 display sync 套用新係數。

## 建議操作順序

1. 先記錄目前五個係數。
2. 只修改一組要對帳的係數，按 `儲存換算係數`。
3. 依序檢查 `Overview`、`Solar`、`Sustainability` 的數字是否與預期一致。
4. 若數字不如預期，先確認發電量 / 自發自用量基礎資料是否存在，再回頭檢查係數。

## 關聯檔案

- [README.md](/Users/yishow/prj/solar_player/README.md)
- [docs/README.md](/Users/yishow/prj/solar_player/docs/README.md)
- [openspec/specs/sustainability-calculation-settings/spec.md](/Users/yishow/prj/solar_player/openspec/specs/sustainability-calculation-settings/spec.md)
