## Context

`add-management-password-gate` 已在 server 端提供：以 scrypt 保存的管理密碼、以 HttpOnly cookie 承載的不透明管理 session、疊在既有來源信任之上的第二道存取條件、server 端的失敗鎖定，以及四個管理認證端點 — 讀取閘門狀態、解鎖、上鎖、變更密碼與開關。該 change 刻意不含任何介面，因此密碼閘預設關閉且無從開啟。

前端方面，`ManagementShell` 負責所有管理路由並以 `Outlet` 承載頁面內容，`LayoutShell` 負責播放路由。兩者分離，因此解鎖畫面只需掛在 `ManagementShell`，播放端天然不受影響。

路由中繼資料集中於 `apps/web/src/app/routeMeta.ts`，管理路由以 `group: "management"` 標記；新增管理頁需要在此登記並於 `router.tsx` 掛載。

## Goals / Non-Goals

**Goals:**

- 操作者可自行開啟、關閉與變更管理密碼。
- 密碼閘開啟後，進入任何管理頁之前必須輸入密碼。
- 解鎖流程不改變網址，也不產生重導迴圈。
- 鎖定狀態一律以 server 回傳的值呈現。
- 播放端完全不受影響。

**Non-Goals:**

- 不改動 server 端的密碼保存、session 發放、存取判定或失敗鎖定。
- 不新增或修改任何管理認證端點。
- 不在前端計數失敗次數或自行判斷鎖定。
- 不引入多使用者、帳號或角色模型。
- 不改動播放端任何行為。

## Decisions

### 解鎖畫面取代管理殼層內容而不做路由跳轉

密碼閘開啟且無有效 session 時，`ManagementShell` 以解鎖畫面取代其 `Outlet` 內容，網址保持不變。解鎖成功後直接顯示原本要去的管理頁。

用路由跳轉到獨立解鎖路由需要記住來源路徑並在解鎖後跳回，且解鎖路由本身必須被排除在守衛之外，容易產生重導迴圈。就地取代沒有這兩個問題，也讓「使用者原本要去哪裡」這件事不需要額外狀態。

替代方案：獨立的解鎖路由加重導。否決原因是重導迴圈風險與額外的來源路徑狀態。

### 閘門狀態一律以 server 為準，前端不自行判斷鎖定

解鎖畫面顯示的鎖定狀態與解除時間，一律取自 `GET /api/management-auth/state` 與解鎖失敗回應中的值。前端不累計失敗次數、不自行推算冷卻是否結束。

前端計數可被直接呼叫 API 繞過，因此它提供的是安全感而非安全性；讓兩處各自維護一份計數也會在兩者不一致時產生難以解釋的畫面。

### 管理存取被拒時回到解鎖畫面

前端管理端請求必須攜帶 cookie 憑證。當任一管理 API 回傳管理存取拒絕外殼時，管理殼層重新讀取閘門狀態並回到解鎖畫面，而不是顯示空白或錯誤頁。

session 會因為過期、密碼變更或他處關閉閘門而失效，這些都會在使用者操作中途發生。把「被拒」對應到「需要重新解鎖」是唯一不會讓使用者卡在無法理解的畫面的處理。

### 安全設定頁獨立於既有設定頁

密碼閘的開關、設定與變更密碼放在新的 `/settings/security` 管理頁，不塞進既有的播放設定或資料來源頁。那兩頁的職責是展示與資料設定，混入認證設定會讓三者都變得難以理解。

## Implementation Contract

**Behavior**

- 密碼閘關閉時，所有管理頁的行為與本次變更前完全相同，不出現解鎖畫面。
- 密碼閘開啟且瀏覽器無有效 session 時，開啟任何管理路由都先顯示解鎖畫面，網址維持為所請求的管理路由。
- 輸入正確密碼後，解鎖畫面消失並直接顯示原本要去的管理頁，過程中不發生路由跳轉。
- 連續輸入錯誤密碼達 server 的門檻後，解鎖畫面顯示鎖定中與解除時間，且送出按鈕不可用。
- 操作者可在 `/settings/security` 開啟密碼閘並設定密碼、關閉密碼閘、變更密碼。
- 管理操作進行中 session 失效時，畫面回到解鎖畫面而非空白或錯誤頁。
- 五個播放展示頁、`/offline` 與 display client 不受影響，不出現解鎖畫面。

**Interface / data shape**

- 新增 `useManagementPasswordGate`，回傳閘門是否開啟、目前是否已解鎖、鎖定解除時間，以及解鎖與上鎖兩個動作。狀態來源為 `GET /api/management-auth/state`。
- 新增 `ManagementUnlockScreen` 元件，接受目前的鎖定狀態與錯誤訊息，並在送出時呼叫解鎖動作。
- `/settings/security` 於 `routeMeta.ts` 以 `group: "management"` 登記，並於 `router.tsx` 掛載。
- `SecuritySettings` 的 viewModel 匯出可否送出的判定：開啟密碼閘時必須有新密碼；由已解鎖 session 變更密碼時必須有目前密碼。
- 管理端請求一律攜帶 cookie 憑證。

**Failure modes**

- `GET /api/management-auth/state` 讀取失敗時，管理殼層維持顯示解鎖畫面而非放行內容，即失敗方向是更嚴格而非更寬鬆。
- 解鎖請求回傳鎖定狀態時，畫面顯示鎖定中與解除時間，且不得暗示密碼是否接近正確。
- 任一管理 API 回傳管理存取拒絕外殼時，管理殼層回到解鎖畫面。
- 安全設定頁在送出前擋下的兩種無效輸入，不得送出請求，並在畫面上說明缺少哪一項。

**Acceptance criteria**

- `useManagementPasswordGate` 測試涵蓋：閘門關閉時不要求解鎖；閘門開啟且未解鎖時要求解鎖；閘門狀態讀取失敗時仍要求解鎖。
- `ManagementUnlockScreen` 測試涵蓋：一般狀態、密碼錯誤狀態、鎖定中狀態三者的呈現，且鎖定中送出按鈕不可用。
- `SecuritySettings` viewModel 測試涵蓋：開啟密碼閘未輸入新密碼時不可送出；變更密碼未輸入目前密碼時不可送出。
- 一條測試斷言管理 API 回傳拒絕外殼時，管理殼層切回解鎖畫面。
- 一條測試斷言播放路由在密碼閘開啟時不渲染解鎖畫面。
- `pnpm verify` 通過。
- 以實際啟動的 app 走一次完整路徑：開啟密碼閘並設定密碼、重開瀏覽器確認出現解鎖畫面、錯誤密碼至觸發鎖定、冷卻後正確密碼解鎖、變更密碼確認需重新解鎖、以 `MANAGEMENT_ACCESS_TOKEN` 關閉密碼閘，並確認全程五個播放展示頁不受影響。

**Scope boundaries**

- 在範圍內：`useManagementPasswordGate`、`ManagementUnlockScreen`、`/settings/security` 頁與其 route meta 及掛載、`ManagementShell` 的守衛、前端請求的 cookie 憑證與拒絕回應處理。
- 不在範圍內：server 端密碼保存與驗證、session 發放與失效、管理存取判定、失敗鎖定、管理認證端點的新增或修改、播放端任何行為、多使用者與角色模型。

## Risks / Trade-offs

- [本 change 依賴 `add-management-password-gate` 的端點，順序錯誤會導致無法實作] → proposal 明確標示相依，且四個端點的契約已在該 change 的 spec 中固定；本 change 的任務全部以消費既有端點的方式表述。
- [解鎖畫面掛在管理殼層，若守衛條件寫錯可能把播放端一併擋住] → `ManagementShell` 與 `LayoutShell` 分離，播放路由不經過管理殼層；驗收項目包含一條斷言播放路由不渲染解鎖畫面。
- [閘門狀態讀取失敗時若放行內容，等於在網路異常時繞過密碼] → 失敗方向明確定為更嚴格：讀取失敗一律顯示解鎖畫面，並列為驗收項目。
- [使用者可能在開啟密碼閘後忘記密碼而被鎖在外面] → 復原路徑由 `MANAGEMENT_ACCESS_TOKEN` 提供，屬 server change 已交付的能力；本 change 的手動驗收路徑包含以該 token 關閉密碼閘。
