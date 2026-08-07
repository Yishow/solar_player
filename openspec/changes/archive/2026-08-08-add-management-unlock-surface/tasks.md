## 1. 閘門狀態與守衛

- [x] 1.1 依設計決策「閘門狀態一律以 server 為準，前端不自行判斷鎖定」，實作 `apps/web/src/hooks/useManagementPasswordGate.ts`，由 `GET /api/management-auth/state` 取得閘門是否開啟、是否已解鎖與鎖定解除時間，並提供解鎖與上鎖兩個動作；前端不累計失敗次數也不自行推算冷卻是否結束。先在 `apps/web/src/hooks/useManagementPasswordGate.test.ts` 寫出「閘門關閉時不要求解鎖」與「閘門開啟且未解鎖時要求解鎖」兩條失敗測試，再實作至通過。
- [x] 1.2 依「Present an unlock surface in place of management content」與設計決策「解鎖畫面取代管理殼層內容而不做路由跳轉」，讓 `apps/web/src/layouts/ManagementShell.tsx` 在需要解鎖時以解鎖畫面取代其 `Outlet` 內容、網址不變，解鎖成功後直接顯示原本要去的管理頁且不發生路由跳轉。以測試斷言這兩種情形的渲染結果驗證。
- [x] 1.3 依「Gate state read failure fails toward the unlock surface」，讓閘門狀態讀取失敗時仍顯示解鎖畫面而非放行管理內容。在 `useManagementPasswordGate.test.ts` 補上該失敗測試後實作至通過。

## 2. 解鎖畫面

- [x] 2.1 依「Reflect server-owned lock state on the unlock surface」，實作 `apps/web/src/components/ManagementUnlockScreen.tsx`：可輸入密碼並送出，呈現一般、密碼錯誤、鎖定中三種狀態，鎖定中顯示 server 回傳的解除時間且送出按鈕不可用，錯誤回饋不透露密碼是否接近正確。先在 `apps/web/src/components/ManagementUnlockScreen.test.tsx` 寫出三種狀態與送出按鈕可用性的失敗測試，再實作至通過。
- [x] 2.2 [P] 依設計決策「管理存取被拒時回到解鎖畫面」，讓 `apps/web/src/services/api.ts` 的管理端請求攜帶 cookie 憑證，並在收到管理存取拒絕外殼時通知管理殼層回到解鎖畫面，而非顯示空白或錯誤頁。以一條測試斷言拒絕回應會使殼層切回解鎖畫面驗證。

## 3. 安全設定頁

- [x] 3.1 依設計決策「安全設定頁獨立於既有設定頁」，在 `apps/web/src/app/routeMeta.ts` 以 `group: "management"` 登記 `/settings/security`（安全設定），並於 `apps/web/src/app/router.tsx` 掛載該路由。以既有的管理路由可見性測試斷言該路由出現在管理路由清單中驗證。
- [x] 3.2 依「Operate the gate from a management security settings surface」，實作 `apps/web/src/pages/SecuritySettings/` 的頁面與 viewModel，透過既有的 `PUT /api/management-auth/password` 完成開啟密碼閘、關閉密碼閘與變更密碼三種操作，且不新增或修改任何端點。以 `apps/web/src/pages/SecuritySettings/viewModel.test.ts` 驗證三種操作各自送出的請求內容。
- [x] 3.3 讓安全設定頁在送出前擋下兩種無效輸入 — 開啟密碼閘未輸入新密碼、變更密碼未輸入目前密碼 — 不送出請求並在畫面上說明缺少哪一項。在 `viewModel.test.ts` 寫出這兩條失敗測試後實作至通過。

## 4. 播放端隔離與交付

- [x] 4.1 依「Keep playback surfaces free of the unlock surface」，斷言密碼閘開啟時，五個播放展示頁與 `/offline` 皆渲染其原有內容且不出現解鎖畫面。新增一條涵蓋此情形的測試作為驗證。
- [x] 4.2 執行 `pnpm verify` 並確認全數通過；若有失敗，修正後重跑至通過並保留實際輸出作為佐證。
- [x] 4.3 以實際啟動的 app 走一次完整路徑作為交付佐證：於安全設定頁開啟密碼閘並設定密碼、重開瀏覽器確認出現解鎖畫面、連續錯誤密碼至觸發鎖定、冷卻後以正確密碼解鎖、變更密碼確認需重新解鎖、以 `MANAGEMENT_ACCESS_TOKEN` 關閉密碼閘；全程確認五個播放展示頁不受影響。
