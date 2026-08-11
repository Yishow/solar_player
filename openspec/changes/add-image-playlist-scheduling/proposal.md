## Why

Images playlist 已有 entry、排序、啟用、秒數、shuffle 與 fallback，但活動圖、歡迎圖、期間限定宣導仍需 operator 當天手動上下架。現場長期 kiosk 更適合讓 entry 自己帶生效日期與每日時段，播放 runtime依可信時間自動判斷資格，並讓管理頁提前看到某天/某時真正會播哪些圖。

## What Changes

- 每個 playlist entry 可選擇設定 start/end datetime，以及 local repeat days + daily start/end time window；未設定 schedule 的 entry 維持永遠 eligible。
- runtime playlist resolver 依 server-authoritative/app trusted time計算 `scheduleEligible` 與 bounded exclusion reason，再和 enabled/asset fallback一起決定 playable order。
- schedule 到期時不在圖片顯示一半硬切；目前 slide完成後於下一個安全 slide boundary 套用新 eligibility。
- shuffle只在當下 eligible entries集合內運作；schedule變動後重新建立 cycle但不選到已失效 entry。
- management 提供 list/calendar-style schedule editor與 effective preview，可選未來時間查看「那時會播哪些圖」。
- offline playback cache包含 schedule metadata；若 absolute time不可信，scheduled-only entries fail closed，unscheduled entries仍可播放。

## Non-Goals

- 不建立完整企業行事曆/活動管理系統。
- 不在本 change新增影片格式。
- 不改 image hash/delete hardening；應先完成 `harden-image-playlist-and-asset-mutations`。

## Capabilities

### New Capabilities

- `image-playlist-scheduling`: playlist entry 的日期/時段資格、trusted-time runtime evaluation、safe boundary 套用、offline semantics與管理 preview。

### Modified Capabilities

（無）

## Impact

- Affected specs: new `image-playlist-scheduling`
- Affected code: playlist schema/service/routes/shared resolver、Images autoplay、offline snapshot、Image Management schedule editor/preview與 tests。
- Affected data: image_playlist_entries 新增 nullable schedule fields。
- Dependency: 建議在 `harden-image-playlist-and-asset-mutations` 後實作。
