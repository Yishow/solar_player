## 1. 明確化 server test discovery

- [x] 1.1 先在 `apps/server/scripts/run-tests.test.mjs`寫失敗測試，覆蓋root/nested discovery、lexical sort、explicit targets與child status；驗證：現況無runner時測試失敗，且案例名稱包含「Server test discovery includes top-level and nested tests」與「Verification failures propagate to the caller」。
- [x] 1.2 依「Deterministic Node-based server discovery」實作 `apps/server/scripts/run-tests.mjs`並讓server test script使用它，以tsx --test --test-concurrency=1執行明確列表；驗證：runner self-tests通過且discovery列出五個src root tests與所有nested tests。

## 2. 建立可信 root verification

- [x] 2.1 依「Root verify is a serial stage runner」在 `package.json`建立build→server→web→deploy→server-runner stages，交付「Root verification covers build and all existing test suites」與「Verification output identifies executed scopes」；驗證：pnpm verify輸出五個stage labels並依序執行。
- [x] [P] 2.2 更新 `docs/ops/conventions.md`移除glob手動繞路，清楚區分test與verify；驗證：文件read-back能指出focused test與完整交付gate，且不再聲稱top-level tests會漏跑。

## 3. Failure propagation 與完整計數

- [x] 3.1 依「Discovery and failure propagation are tested」在temp fixture令一個top-level test與一個deploy stage分別失敗；驗證：兩種情況pnpm verify皆nonzero、保留原stage label且不被後續command掩蓋。
- [x] 3.2 fresh執行pnpm verify並保存discovery/count evidence；驗證：至少377 server、809 web、37 deploy既有tests與新runner tests全數執行，production build通過。
