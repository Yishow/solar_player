## 1. 重現通知被舊結果清除

- [x] 1.1 在 apps/web/src/hooks/displaySyncDraftGuard.test.ts 加入 mounted bootstrap committed token 1→edit→remote event→revert 測試，斷言 pending=true 且 event 後 reloads=0；保存修正前 RED，對應 Weather reload outcomes cannot be replayed to acknowledge later notices。
- [x] 1.2 在同一 guard test 補相同 token effect rerun、較舊 token、第一個 committed 及 failed/stale/deferred 情境，驗證每個 outcome 只作用一次且不確認後來 notice；以可觀察 pending/reload 次數斷言固定邊界。

## 2. 最小修正與整合

- [x] 2.1 在 apps/web/src/hooks/displaySyncDraftGuard.ts 實作「Reload outcome 單次消費」，Weather opt-in 記錄已處理 operationToken 並略過 equal/older；執行前述 mounted tests，確認 local revert 不清 pending、首個合法結果仍能處理。
- [x] 2.2 在 apps/web/src/pages/MqttSettings/useMqttSettingsData.test.ts 落實「保留 pending 與 currentness 邊界」的整合驗證：keep-editing 不 fetch，explicit discard 的新 current committed 才清 pending，failed/retry/post-discard edit 與 unmount 維持保護；測試串接真實 Weather data hook 與 guard。
- [x] 2.3 執行 pnpm --filter @solar-display/web test，確認 Weather 新時序與非 Weather guard consumers 的 auto-reload/clean-state 既有測試同時通過；若有失敗只修本次 outcome 消費造成的回歸。

## 3. 審查與交付證據

- [x] 3.1 主代理 review 最終 source/diff，分開核對 Standards 與 management-display-sync-draft-protection Spec，執行安全 audit 並修正本範圍 findings；檢查沒有變更 persistence、API、polling 或其他頁面的 pending policy。
- [x] 3.2 最終版本執行 pnpm verify 與 spectra validate fix-weather-pending-notice-replay，記錄實際 PASS/FAIL/NOT RUN；checkpoint 列出變更檔案、回復依據與剩餘驗證，不以單一 helper test 宣稱完整整合通過。
