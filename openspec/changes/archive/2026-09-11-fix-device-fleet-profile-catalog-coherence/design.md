## Context

DeviceFleet 的 route model 保存 profiles，嵌入的 PlaybackProfilesContent 則自行 refreshProfiles。分頁切換會 unmount 子元件，因此 mutation 後子元件的新清單既沒有更新群組選單，也無法在下次 mount 保留。修正涉及兩個 React owner 的資料交接，但不涉及 Profile API 或版本治理。

## Goals / Non-Goals

**Goals:**

- 同一 Device Fleet 工作階段的策略清單與群組指派選單，在成功刷新後使用同一份 Profile catalog。
- 保留獨立 Playback Profiles route、catalog 發布當下仍掛載的群組表單及其他資源狀態；不新增跨 tab 草稿保留。

**Non-Goals:**

- 不保存所有 tab 的未儲存草稿、不新增 API/polling/store、不改 archive/publish 業務規則。
- 不重設 devices、groups、liveness、filters，不重新設計管理頁外觀。

## Decisions

### Profile catalog 回傳父層

PlaybackProfilesContent 接受可省略的權威清單回呼；refreshProfiles 成功取得既有 API list shape 後，同時更新本地 catalog 並通知 DeviceFleet。由 DeviceFleetContent 傳遞該回呼，DeviceFleet 只更新 model 的 profiles slice。這比整頁 reload 或載入全部 fleet 資料小，且獨立 route 不必提供回呼。

### 成功快照與失敗狀態

create、rename、archive 後的成功 refresh 都走相同發布入口。失敗保留最後成功 catalog，沿用可見錯誤並於同一元件提供「重新載入清單」按鈕，只呼叫 getPlaybackProfiles，不能重送已成功的 create/rename/archive；沿用既有按鈕樣式與 pending 防重複操作，不新增 CSS。不發布空清單，也不先靠自行拼接 mutation 回應宣稱同步。選項是否可指派由既有 Profile 狀態規則決定；封存不抹除已解析的群組上下文。

## Implementation Contract

- In scope：apps/web/src/pages/DeviceFleet/index.tsx、apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx 與 apps/web/src/pages/PlaybackProfiles/PlaybackProfilesContent.tsx 的 catalog 回傳；對應 apps/web/src/pages/DeviceFleet/index.test.tsx 與 apps/web/src/pages/PlaybackProfiles/index.test.ts。
- Interface：使用現有 profiles list 型別的 optional callback，只有成功取得的權威陣列能發布。Fleet 以 functional state update 保留所有其他 model 欄位。
- Behavior：在策略分頁新增 New Test Profile，切回裝置分頁後可用於新建及編輯群組，再回策略分頁仍可見；rename 顯示新名稱，archive 移出新指派選項。
- Failure：mutation 失敗不發布；mutation 成功但 refresh 失敗不丟棄最後成功清單，顯示錯誤且只重讀清單的重試成功後才同步；清單 refresh failure 後記錄可重試狀態，重新載入成功才清除。真正成功的空清單可發布，須與讀取失敗區分。
- Acceptance：mounted tests 透過實際 tab navigation、create/rename/archive 操作及 group controls 驗證，不只檢查 callback 被呼叫。加入 catalog request 在途時返回 Devices、填入新掛載的群組表單後才完成 request，確認 publication 不重設該表單；另驗證獨立 route 未提供 callback 仍可更新；以 browser interaction witness 驗證新增→切頁→指派→返回。
- Out of scope：後端 API、Profile publish/version 契約、無關表單生命週期、FHD 或現場 launch acceptance。

## Risks / Trade-offs

- [父層更新帶動其他欄位回初值] → 限制更新 profiles slice，驗證仍掛載表單的輸入保留；切頁已卸載表單的恢復不在本次契約內。
- [子元件本地 state 與父層短暫不一致] → 兩者只接收同一成功刷新快照，回到分頁時以父層新快照初始化。
- [封存名稱仍供既有群組診斷使用] → 保留 resolved context，僅依既有規則排除新指派選項。
