## 1. 固定跨分頁重現

- [x] 1.1 在 apps/web/src/pages/DeviceFleet/index.test.tsx 加入真實 mounted tabs 測試：新增 New Test Profile→Devices 的新建/編輯群組選單→返回 Profiles，修正前確認新項目遺失；保存 RED，對應 Device Fleet shares refreshed Profile catalogs across tabs。
- [x] 1.2 在同一 Fleet 測試先暫停 catalog refresh、返回 Devices 並填入新掛載 group form，再讓 request 完成；斷言 publication 保留當下輸入與 devices/groups/liveness/filter，並明確不要求保存切頁前已卸載的表單。

## 2. Catalog 接線與失敗保護

- [x] 2.1 實作「Profile catalog 回傳父層」：apps/web/src/pages/PlaybackProfiles/PlaybackProfilesContent.tsx 增加 optional catalog callback，經 apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx 傳至 apps/web/src/pages/DeviceFleet/index.tsx 僅更新 profiles slice；以前述 mounted navigation tests 證明清單一致。
- [x] 2.2 落實「成功快照與失敗狀態」：create/rename/archive 的成功 refresh 才發布、失敗保留最後清單並顯示錯誤與「重新載入清單」按鈕，只呼叫 getPlaybackProfiles 且沿用既有樣式；在 apps/web/src/pages/PlaybackProfiles/index.test.ts 驗證 failed refresh、retry 不重送 mutation、有效空陣列及未提供 callback 的獨立 route。
- [x] 2.3 在 apps/web/src/pages/DeviceFleet/index.test.tsx 驗證 rename 更新兩分頁名稱、archive 排除新指派但保留 resolved group context；執行 pnpm --filter @solar-display/web test 確認所有相關行為通過。

## 3. Witness 與收尾

- [x] 3.1 以本機管理頁 browser interaction witness 操作新增 Profile→切換 Devices→群組指派→返回 Profiles，記錄 URL、操作、結果與截圖位置；確認不需整頁 reload，browser 不可用時明列 NOT RUN，不以 mounted test 宣稱 browser 或人工 acceptance。
- [x] 3.2 主代理 review 最終 source/diff，分開核對 Standards 與 device-fleet-management-surface Spec 並執行安全 audit；修正本範圍 findings，以測試與 diff 證明 API、其他表單生命週期與外觀未越界。
- [x] 3.3 最終版本執行 pnpm verify 與 spectra validate fix-device-fleet-profile-catalog-coherence，彙整 tests/browser 的實際 PASS/FAIL/NOT RUN、變更範圍、回復依據與剩餘驗收為 checkpoint；尚無 witness 時不得宣稱整體驗收完成。
