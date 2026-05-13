# Settings Playback And Images Evidence

## Scope Review

- Change: `align-solar-display-settings-playback-images`
- Route scope:
  - `/settings/playback`
  - `/settings/images`
- Explicitly not included:
  - `/settings/mqtt`
  - `/settings/circuits`
  - monitoring / maintenance routes

## Fresh Verification

1. `pnpm --filter @solar-display/server exec tsx --test src/routes/playback.test.ts src/routes/images.test.ts`
   - Result: pass (`17/17`)
2. `pnpm --filter @solar-display/web build`
   - Result: pass

## Route Evidence

### `/settings/playback`

- Prototype source:
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/07-playback-settings.html`
- Current-route screenshot:
  - `artifacts/umbrella-final-fhd/07-settings-playback.png`
- Manual review:
  - summary cards、輪播控制表單、save status panel 與右側 action hierarchy 已在 shared management shell 內完成對位。
  - page number `7/14` 與 footer navigation 正常。

### `/settings/images`

- Prototype source:
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/08-image-management.html`
- Current-route screenshot:
  - `artifacts/umbrella-final-fhd/08-settings-images.png`
- Manual review:
  - 在空 library 狀態下仍保留 upload drop zone、sync panel、edit panel 與 dense section layout，不會退化成破版空白頁。
  - 這一批只處理低風險 settings 頁，沒有混入 MQTT 或 circuits 專屬 control flow。

## Batch A Exit Review

- Server route tests 重跑後確認：
  - playback settings 的讀取 / 儲存契約仍在
  - image management 的 library route、metadata / reorder / delete 契約仍在
- Current-route screenshots 也確認：
  - Batch A 的管理頁 shell family 已一致
  - 這份 evidence bundle 沒有把 `/settings/mqtt` 或 `/settings/circuits` 混入
