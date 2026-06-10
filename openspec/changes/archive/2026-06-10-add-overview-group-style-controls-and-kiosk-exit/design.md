## Context

`Overview` 頁目前已經把 `surfaceOpacity`、`surfaceBlur`、`shadowStrength` 等 card appearance 值納入 `DisplayCardStyleConfig`，也已經透過 `DisplayPagesEditor` 逐卡暴露給 inspector；但操作員若只想快速統一 KPI cards 或底部 widgets 的玻璃感，現在仍需逐張重複修改。另一方面，`/device-status` 已經是現場 device / display observability 的集中入口，但目前只有 safe diagnostics，沒有真正能讓 kiosk 操作員退出 Firefox 的受控入口；而 kiosk 現場只有滑鼠，無法依賴右上角視窗關閉。

目前 workspace 另有一組尚未提交的 `react-grab` devtools wiring 變更，目標是讓開發期 devtools 只在 dev mode 載入，不進 production bundle。因為這組改動尚未被正式驗證與提交，本次設計也要把 production build exclusion contract 固定下來。

這次變更同時跨 `Overview` authoring、`Device Status` 前端操作、server route、kiosk deploy helper 與 web build wiring，因此需要先固定可觀察行為與安全邊界，再進 apply。

## Goals / Non-Goals

**Goals:**

- 在 `Overview` editor 提供兩組直接控制：`KPI cards` 與 `bottom widgets`。
- 讓群組控制可一次同步 `surfaceOpacity`、`surfaceBlur`、`shadowStrength` 到同類全部卡片。
- 保留既有單卡 / 單 widget 細部欄位與 draft/live 流程。
- 在 `裝置狀態` 頁提供真正可退出 kiosk browser 的操作。
- 退出後明確告知操作員回桌面後可點 `Solar Display Kiosk` 重新進入。
- 將退出能力限制在固定 helper 與可信管理端路徑，不暴露泛用 host command 執行面。
- 確保 `react-grab` 只在 dev mode bootstrap，production build 不帶入該 devtools 依賴。

**Non-Goals:**

- 不把所有 display pages generalize 成全域 card family quick controls。
- 不新增 reboot、shutdown、restart service 等其他 host-level device control。
- 不修改 kiosk 自動登入、自動啟動的整體流程，只補退出 helper 與前端入口。
- 不移除既有 per-card / per-widget inspector controls。
- 不把一般 debug/devtools framework 擴張成正式 production operator surface。

## Decisions

### Keep Overview quick controls as family-scoped authoring regions

`Overview` editor 會新增兩個 family-scoped regions，而不是把控制塞進某一張 card 的 inspector，也不是做全域套用按鈕：

- `Overview KPI Cards Appearance`
- `Overview Bottom Widgets Appearance`

每個 region 只暴露三個高頻外觀值：`Surface Opacity`、`Surface Blur`、`Shadow Strength`。變更任一欄位時，editor 直接把值同步寫入對應 family 全部成員的既有 style paths：

- KPI cards → `cardStyles.power/today/total/co2Today/co2Total`
- bottom widgets → `widgetStyles.weather/phasePower/generationTrend/alertNotifications`

這樣可重用現有 `DisplayCardStyleConfig`、draft session、save/publish 機制，不需要新增第二份群組設定 schema，也不會讓 runtime 分不清是 group value 還是 per-card value。

替代方案：
- 做一份新的 group config 再讓 runtime merge 到每張 card。缺點是 schema 與 merge 規則變複雜，而且會產生 precedence 問題。
- 做「套用到全部」按鈕。缺點是操作步驟比較多，對現場單滑鼠不夠直接。

### Route kiosk exit through a fixed server-side helper

真正退出 kiosk 不能依賴 `window.close()`，因為 Firefox kiosk 對 script 關窗不可靠。這次改成固定 server route：

- `POST /api/device/kiosk-exit`

這條 route 不接受任意命令參數，也不暴露 shell 輸入。server 只會執行固定 helper：安裝後位於 kiosk user home 的 `stop-solar-kiosk.sh`。helper 的責任只包含結束 Firefox kiosk process；不得延伸成任意 host command runner。

替代方案：
- 前端直接 `window.close()`。缺點是行為不可信，最容易在現場失敗。
- 將退出混入 diagnostics action。缺點是語意錯誤，既有 diagnostics spec 明確限定 safe read / refresh。

### Keep kiosk exit visible on Device Status with explicit re-entry guidance

退出操作會放在 `Device Status` 現有 `ds-actions` 區塊，因為這裡已是裝置層操作入口。按鈕文案維持直白：`離開系統`。點擊前需要確認；點擊後若成功，前端只需顯示短暫 feedback，隨即因 browser 被關閉而離頁。

同一區塊需同時顯示再進入說明，且桌面名稱必須與 deploy 安裝的 `.desktop` 名稱一致：`Solar Display Kiosk`。這樣操作員不用記網址，也不需碰鍵盤。

替代方案：
- 把說明放到 runbook 或 diagnostics helper 文案。缺點是太深，現場不一定會讀。
- 只在退出成功後 toast 說明。缺點是 browser 可能已立刻關閉，看不到完整訊息。

### Keep react-grab devtools development-only at the module resolution boundary

`react-grab` 是開發期工具，不應靠 runtime `if (import.meta.env.DEV)` 單獨保證不被 production 帶入。這次 contract 要求在 module resolution 邊界就把 production / test mode 導到 noop bootstrap，並用 build 驗證確認正式 bundle 不含 `react-grab` 代碼痕跡。

這表示：

- `main.tsx` 仍可保留單一 bootstrap import，但 production mode 必須 resolve 到 noop module。
- `vite.config.ts` 與相關 alias helper 必須是唯一的 mode 分流來源。
- 驗證不只看型別或單元測試，還要包含一次正式 web build 後的 bundle 檢查。

替代方案：
- 在 `main.tsx` 改成動態 import + `if (DEV)`。缺點是容易讓不同 entrypoint 重複處理 mode gating，且未必能提供穩定的 bundle-level contract。
- 讓 production 也安裝 `react-grab` 但不執行。缺點是仍把 devtools 依賴帶進正式包，不符合需求。

## Implementation Contract

### Behavior

- 在 `/display-pages/editor?page=overview`，操作員 SHALL 看到兩個新的 Overview family appearance regions，分別控制 KPI cards 與 bottom widgets。
- 編輯 `Surface Opacity`、`Surface Blur`、`Shadow Strength` 任一值時，對應 family 的所有既有 style records SHALL 同步更新於目前 draft session。
- 儲存 Overview draft 後，重新讀回 draft 或 render preview 時 SHALL 保留同步後的各 card/widget style 值。
- 在 `/device-status`，受信任管理端 SHALL 看到 `離開系統` 操作；未受信任請求不得取得可用的退出執行結果。
- 操作員確認退出後，server SHALL 執行固定 kiosk stop helper；成功時 Firefox kiosk 退出回桌面，失敗時前端留在頁面並顯示錯誤。
- `裝置狀態` 畫面 SHALL 明示重新進入方式：回桌面後點 `Solar Display Kiosk`。

### Interface / data shape

- 新增前端 API helper：呼叫 `POST /api/device/kiosk-exit`，回傳 `{ success, data, timestamp }` 形狀，其中 `data` 至少包含結果訊息與 re-entry guidance。
- 新增 server route：`POST /api/device/kiosk-exit`。
- 新增 deploy helper：`deploy/stop-solar-kiosk.sh`，由 `deploy/install-kiosk.sh` 安裝到 kiosk user `bin/`。
- Overview editor 新增的 family regions 只寫入既有 `cardStyles.*` / `widgetStyles.*` paths，不新增新的 persisted top-level config key。
- `react-grab` devtools bootstrap 在 production / test mode 必須 resolve 到 noop module，並可由 build 產物檢查證明正式 bundle 不含 `react-grab`。

### Failure modes

- 若 kiosk helper 缺失、不可執行、或 host command 失敗，route SHALL 回傳失敗 envelope，前端不得假裝已退出。
- 若請求不是受信任管理讀寫情境，route SHALL 拒絕，不得透露 host execution 細節。
- 若操作員只修改單卡欄位，系統 SHALL 維持既有 per-card behavior，不得被新的 family regions 覆蓋除非操作員明確修改 family control。
- 若 production build 仍解析到 `react-grab` 真實 bootstrap，該狀態視為失敗，不得以「執行期沒有呼叫」視為通過。

### Acceptance criteria

- Web tests 證明 Overview editor 會暴露兩個 family appearance regions，且欄位變更會同步到全部 target style paths。
- Web tests 證明 `Device Status` 會渲染 `離開系統` 與 `Solar Display Kiosk` 再進入說明。
- Server tests 證明 `POST /api/device/kiosk-exit` 在 trusted path 成功執行固定 helper，在 untrusted path 被拒絕，且不接受任意 action payload。
- Web build 驗證證明 production bundle 不含 `react-grab` 或其真實 bootstrap 內容，且 mode alias tests 仍通過。
- 受影響測試通過後，於遠端 kiosk 主機實測：可從 `/device-status` 退出 Firefox，回桌面後可重新啟動 `Solar Display Kiosk` 並回到系統。

### Scope boundaries

**In scope**
- Overview 兩組 family appearance controls
- Device Status 離開 kiosk 按鈕與說明
- 固定 stop helper 與 install wiring
- `react-grab` dev-only bootstrap exclusion 與其驗證
- 對應 API / tests / remote verification

**Out of scope**
- 其他頁面的 group controls
- 任意 host command 執行
- 重新設計 diagnostics surface 或新增更多 device control
- 調整 systemd、autologin、firefox autostart 整體策略
- 一般性的 bundle size 最佳化或其他 devtools 框架調整

## Risks / Trade-offs

- [Risk] server process 與 kiosk Firefox 若不在可互相結束的權限邊界內，退出 helper 可能失敗。 → Mitigation：helper 固定安裝到 kiosk user，遠端驗證時先確認實際執行身份與 process 可見性。
- [Risk] family control 直接展開到多個 style paths，若未來新增 Overview card/widget 成員，容易漏同步。 → Mitigation：集中維護 family key list，並用測試鎖住每個 group 的覆蓋範圍。
- [Risk] 誤觸 `離開系統` 會中斷當前操作。 → Mitigation：加入確認步驟與明確再進入說明。
- [Risk] 目前未提交的 `react-grab` wiring 可能只在單元測試層通過，卻沒有真正鎖住 production bundle。 → Mitigation：把 bundle-level grep / artifact 檢查納入 acceptance criteria 與最終驗證。
