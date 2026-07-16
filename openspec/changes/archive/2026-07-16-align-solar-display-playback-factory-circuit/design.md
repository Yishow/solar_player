## Context

這個 change 對應 umbrella rollout 的 Playback Batch B。`/factory-circuit` 的主要風險不在 general KPI，而在 flow diagram、circuit threshold、status label、empty-state behavior，以及 editor 發布後保存在 SQLite 的 config 是否仍符合目前 slot contract。Pi5 live API 已證實舊 config 與新程式碼可同時存在，單改 TypeScript seed geometry 不足以修復已上線裝置。

## Goals / Non-Goals

**Goals:**

- 讓 `/factory-circuit` 對齊 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html` 的 flow 與 circuit card structure。
- 集中處理 status label / color / load percentage mapping。
- 讓中壢六工程列以 84px 高度、95px step 排列，第一列 top=160、最後一列 top=635，整組中心與配電盤水平線 Y=440 對齊。
- 將既有 Pi5 的 legacy persisted config 與 circuit/topic metadata migration 到目前六 slot contract，保留其他 editor-authored fields。
- 保留空 circuits、離線 fallback 與 playback route contract。

**Non-Goals:**

- 不處理其他 playback route 或觀音八列 compact layout。
- 不變更 circuits API schema。
- 不覆寫與 load rows、legacy circuit slots、office topic 名稱無關的 editor 設定。

## Decisions

### Treat factory circuit as a standalone flow-heavy playback batch

這頁的 risk profile 與 KPI/hero 頁不同，所以不能和其他 playback 頁混做。

### Centralize circuit threshold and empty-state mapping

`warningMin`、`attentionMin`、empty state 等行為要集中定義，避免散落在 render branches。

### Migrate persisted editor data instead of bypassing it

`/display-pages/editor` 是展示設定 source of truth。migration 只替換 `factory-circuit` config 內的 `regions.loadRows` 與 `regions.loadRowStates`，其他 regions 原樣保留；不得在 playback JSX 裡忽略 live config 或用 page-local CSS 強壓座標。已套用 023 的裝置另由 024 移除 023 誤加且 runtime 不讀取的 root `loadRows/loadRowStates`。

### Normalize legacy circuit metadata conservatively

migration 停用 `production/hvac/lighting/ev/infrastructure` legacy rows，保留並修正既有 `office` row，避免建立第二筆相同 slot。`factoryOfficePower` 的 topic 顯示名稱修正為「事務系 / Office & Administration」。migration 必須可重跑且不得影響 `factory-circuit-guanyin`。

## Implementation Contract

**Behavior**

- `/factory-circuit` 應接近 reference 的 flow composition。
- 六個中壢工程列不得重疊，順序為 `stamping/body/painting/assembly/utility/office`，connector endpoint 必須落在各列垂直中心。
- 事務系不得顯示為裝配工程。
- circuit status 顯示與空資料狀態應一致且可預測。

**Interface / data shape**

- 現有 circuits API shape 不變。
- `factory-circuit` persisted config 使用 current slot keys；Guanyin config 不變。
- page-local adapter 維持 circuit row 到 UI status、color、percentage 的既有映射。

**Failure modes**

- 若只更新 TypeScript default，舊 live config 仍會覆蓋 `office` geometry；migration test 必須重現並防止此情況。
- 若 legacy office topic name 未正規化，第六列仍會錯標。
- 若 API 回空陣列，頁面仍需保留完整 section structure。

**Acceptance criteria**

- migration fixture 從 legacy config 執行後，draft/live/base 三份 config 皆只保留 current load-row keys，且六列座標為 `160/255/350/445/540/635`。
- legacy circuit rows 停用、office metadata 與 `factoryOfficePower` 顯示名稱正確，重跑 migration 不改變結果。
- `pnpm --filter @solar-display/web test -- src/pages/FactoryCircuit/layout.test.ts` 與 migration focused test 通過。
- `pnpm verify` 與 `git diff --check` 通過。
- Pi5 `http://100.99.99.2:3000/factory-circuit?autoplay=0` 的 fresh 1920x1080 witness 顯示六列不重疊、事務系文案正確、routing center 與配電盤水平線對齊。
- 最終視覺 acceptance 仍由使用者決定。

**Scope boundaries**

- In scope：`/factory-circuit`、中壢六列幾何、既有 `factory-circuit` SQLite config/circuit/topic metadata、focused tests、Pi5 witness。
- Out of scope：其他 playback 頁、觀音八列 layout、circuits API schema、與本 regression 無關的 editor fields。

## Risks / Trade-offs

- migration 會更新已發布 live config；因此必須保留其餘 JSON fields、增加版本並記錄 system migration attribution。
- 停用 legacy circuit rows 可能讓舊 topic 不再出現在播放聚合，但 current six-slot rows 已各自存在，這正是目前 contract。
