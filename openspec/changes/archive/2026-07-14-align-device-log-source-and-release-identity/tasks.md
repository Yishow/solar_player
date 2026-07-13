## 1. Least-privilege journald reader

- [x] 1.1 在 `scripts/deploy.test.mjs`與service fixtures先寫fixed unit、limit clamp、argument rejection、sudoers render/visudo failure tests，覆蓋「Provide ESM-safe Device Status log access」；驗證：現況因沒有fixed reader而失敗。
- [x] 1.2 依「Read only the solar-display journal through a fixed helper」實作 `deploy/read-solar-display-journal.sh`與 `deploy/install-kiosk.sh` least-privilege install；驗證：只允許recent/export與1..500、unit永遠solar-display、無shell interpolation，sudoers syntax failure不安裝。

## 2. Server log API contract

- [x] 2.1 實作 `deviceLogService.ts` injected runner與tests，解析固定JSON lines、區分available/unavailable且不接受caller unit/path；驗證：valid/malformed/sudo denied/journal missing fixtures通過。
- [x] 2.2 依「Return explicit log availability and bounded export」修改trusted routes：summary JSON與text/plain export，spawn前先auth；驗證：route tests覆蓋200/503/403、limit clamp、Content-Disposition與untrusted zero-spawn。

## 3. Release manifest

- [x] [P] 3.1 依「Generate one release manifest per bundle」實作 `scripts/generate-release-manifest.mjs`並接入root/direct deploy，交付「Deployment produces an immutable release manifest」；驗證：clean/dirty commit fixtures、server package version、highest migration與bundle inclusion tests通過。
- [x] 3.2 將manifest讀取接入server config/device status，交付「Runtime reports release identity without deep health work」；驗證：valid/missing/corrupt manifest tests通過且/health source/test證明不讀manifest。

## 4. Device Status 呈現

- [x] 4.1 依「Present log source and release identity in Device Status」更新API types、loader/view model/content，顯示Journald availability/retention/export與release fields；驗證：web API/viewModel/content tests覆蓋available、unavailable、dirty release與access denied。
- [x] [P] 4.2 更新 `deploy.md`的log truth、reader permissions、release read-back與failure runbook；驗證：文件read-back能從注入error定位同一journal evidence並比對releaseId。

## 5. 整體驗證

- [x] 5.1 執行deploy tests、focused server service/route tests、完整server/web tests與production build；驗證：所有commands exit zero且沒有LOG_DIR file-listing production contract殘留。
- [x] 5.2 在非production Linux host安裝reader/sudoers、注入一筆solar-display error並建一個release bundle；驗證：trusted Device Status取得同一筆bounded record與正確release identity，untrusted request未執行helper。
