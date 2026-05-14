## 1. Shared panel and form hierarchy for settings routes

- [x] 1.1 完成 “Align settings page panels and form hierarchy while preserving the current interaction contracts” 並對應 ### Keep management shell semantics and align page internals with reference panels，為 `/settings/playback`、`/settings/images`、`/settings/mqtt`、`/settings/circuits` 建立 page-local layout constants 與 shared reference panel/form hierarchy；驗證方式為 code review，確認四頁的 major panel geometry 與 form grouping 不散落在 JSX。
- [x] 1.2 完成 “Align only the declared settings and management form surfaces in this change”，確認本 change 僅覆蓋四條 settings routes，不把 playback/display routes 拉進同一批；驗證方式為內容 review 與 artifact route 清單核對。

## 2. Low-risk settings routes

- [x] 2.0 完成 ### Split low-risk and high-risk settings routes inside one change 的 low-risk phase 定義，確認 `/settings/playback` 與 `/settings/images` 先作為共用 reference panel/form primitives 的驗證批次；驗證方式為 artifact review，確認後續 high-risk tasks 以前述 primitives 為前提而非平行發散。

- [x] 2.1 完成 low-risk family 遷移，讓 `/settings/playback` 與 `/settings/images` 套用 reference panels、reference cards、reference form rows，同時保留播放設定儲存/排序與圖片上傳/選取/預覽行為；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工檢查兩頁的 controls 仍可操作。
- [x] 2.2 完成 low-risk settings 的 interaction preservation 驗證，確認 playback settings 的 save/reorder 與 image management 的 upload/library/selection/preview/error states 未被視覺對齊破壞；驗證方式為 code review 與人工 smoke check。

## 3. High-risk MQTT settings route

- [x] 3.0 完成 ### Split low-risk and high-risk settings routes inside one change 的 high-risk MQTT phase 定義，確認 `/settings/mqtt` 在 low-risk primitives 驗證後再進行 reference 遷移與狀態映射；驗證方式為 artifact review 與 phase 邊界檢查。

- [x] 3.1 完成 “Provide explicit display-state mapping for high-risk settings pages” 並對應 ### Introduce explicit display-state mapping for MQTT and circuits，為 `/settings/mqtt` 建立 broker status、topic row、preview card、loading、disabled、error、success 的 explicit display-state mapping；驗證方式為 code review，確認這些 display fields 不在 JSX 多處重算。
- [x] 3.2 完成 `/settings/mqtt` 的 reference panel 遷移與 high-risk verification，確認 load config、save config、test connection、broker status、topic mapping rows、disabled/loading/error states、success/failure feedback 都保留；驗證方式為執行 `pnpm --filter @solar-display/web build`，若檔案存在則執行 `pnpm --filter @solar-display/server test -- src/routes/settings-mqtt.test.ts src/routes/settings-mqtt-save-regression.test.ts`。

## 4. High-risk circuit settings route

- [x] 4.0 完成 ### Split low-risk and high-risk settings routes inside one change 的 high-risk circuits phase 定義，確認 `/settings/circuits` 與 MQTT 同屬 high-risk family，但保有獨立驗證 gate；驗證方式為 artifact review 與 phase 邊界檢查。

- [x] 4.1 完成 “Provide explicit display-state mapping for high-risk settings pages” 的 `/settings/circuits` mapping，將 circuit row、status tone、visibility、validation、save/update feedback 集中到 explicit display-state mapping；驗證方式為 code review，確認 circuit row display fields 與 validation state 不散落在 JSX。
- [x] 4.2 完成 `/settings/circuits` 的 reference panel / table hierarchy 遷移與 high-risk verification，確認 circuit list、mapping、save/update、validation states 都保留；驗證方式為執行 `pnpm --filter @solar-display/web build`，若檔案存在則執行 `pnpm --filter @solar-display/server test -- src/routes/circuits.test.ts`。

## 5. Batch verification and scope guard

- [x] 5.1 完成 settings surface batch 驗證，確認四頁在 loading、error、success、disabled、empty-state 情境下仍可操作且版面可讀；驗證方式為執行 `pnpm --filter @solar-display/web build` 並人工 smoke check。
- [x] 5.2 完成 narrow-scope 收尾，確認本 change 沒有聲稱完成 playback/display alignment、backend contract changes 或 shell host foundation 重構；驗證方式為 `spectra analyze align-reference-settings-management-surfaces --json` 與 artifact review。
