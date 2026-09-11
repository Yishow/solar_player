## Problem

P2 修正：Device Fleet 的播放策略分頁新增 Profile 成功後，切回裝置分頁時新增／編輯群組的 Profile 選單仍只有舊清單；再切回策略分頁，新項目從畫面消失，重新載入整頁才恢復。資料庫沒有遺失該 Profile，缺陷在同一管理頁的 catalog coherence。

## Root Cause

DeviceFleet 保存初次 route model 的 profiles，PlaybackProfilesContent 的 refreshProfiles 只更新子元件自己的 state。DeviceFleetContent 切換 tab 會 unmount 子元件，下一次 mount 又使用父層舊 profiles；Profile mutation 沒有回傳 catalog 給父層。

## Proposed Solution

- 讓 Profile create、rename、archive 完成後取得的權威清單同步至 DeviceFleet 的 profiles owner，再供群組控制項與策略分頁使用。
- 保留既有獨立 Playback Profiles route；同步只更新 profiles，不覆蓋 devices、groups、liveness、filter 或仍掛載表單的未儲存欄位。
- 清單刷新失敗時保留最後成功清單、顯示錯誤狀態並提供只重讀清單的「重新載入清單」操作，不把失敗當成空清單或宣稱已同步。
- 補真實 mounted tab-navigation tests，覆蓋新增後指派、重新命名、封存與獨立 route 相容性。

## Success Criteria

- 新增 New Test Profile 後，無須整頁 reload 即可在新群組與編輯群組選單選到；返回策略分頁仍可見。
- 重新命名後各 catalog 選單使用新名稱；封存後不可再作為新指派選項，但既有 resolved group context 仍依原服務契約呈現。
- profile catalog 發布時不清除當下仍掛載的群組表單或其他資源的 state；切頁造成的既有表單 unmount/reset 行為不變；refresh 失敗不發布空 catalog。
- 受影響 mounted tests、管理頁 browser interaction witness、兩軸 review 與 pnpm verify 通過，人工視覺／現場 acceptance 不由自動測試代替。

## Capabilities

### New Capabilities

- （無）

### Modified Capabilities

- device-fleet-management-surface：補齊同一 Device Fleet surface 內 Profile catalog mutation 與 Group assignment 的一致性。

## Impact

- Affected specs：device-fleet-management-surface；versioned-playback-profile-governance 的 API 與不可變版本規則不變。
- Affected code：
  - Modified：apps/web/src/pages/DeviceFleet/index.tsx
  - Modified：apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - Modified：apps/web/src/pages/DeviceFleet/index.test.tsx
  - Modified：apps/web/src/pages/PlaybackProfiles/PlaybackProfilesContent.tsx
  - Modified：apps/web/src/pages/PlaybackProfiles/index.test.ts
  - New：（無）
  - Removed：（無）
- 不增加 API、polling、資料庫遷移或全頁重新載入依賴；本次只起草，不實作。
