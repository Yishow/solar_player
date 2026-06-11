## Why

Image Management 的殘餘成本集中在 mutation 後整包 reload：metadata save、upload、set cover、playlist governance 變更之後，library、storage、health、references 很容易一起 cold refresh。這頁需要獨立 change，把 selected-entity refresh contract 寫清楚。

## What Changes

- 定義 selected image / selected playlist row 的 targeted refresh contract。
- 規範 metadata save、upload、set cover、playlist governance 後哪些 diagnostics 必須更新，哪些 baseline 應直接保留。
- 加入 no-regression 邊界：library、selection、fallback、asset health、references 行為不得退化。

## Non-Goals (optional)

- 不處理 Playback Settings、MQTT Settings、Circuit Settings。
- 不改 image management API 或 playlist governance schema。

## Capabilities

### New Capabilities

- settings-image-management-targeted-refresh: 定義 Image Management 在 mutation 後以 selected entity 為中心的 targeted refresh 契約。

### Modified Capabilities

(none)

## Impact

- Affected specs: settings-image-management-targeted-refresh
- Affected code:
  - New: (none)
  - Modified: apps/web/src/pages/ImageManagement/index.tsx, apps/web/src/pages/ImageManagement/loadModel.ts
  - Removed: (none)
