## 1. Pure parser tests 與實作

- [x] 1.1 在 `imageContentValidation.test.ts`建立合法PNG/JPEG/WebP、renamed text、truncated segments、MIME不一致與dimension boundary fixtures，覆蓋「Uploaded image type is detected from bytes」、「Image container is complete enough for safe playback」與「Image dimensions stay within the playback budget」；驗證：現況無validator而測試失敗。
- [x] 1.2 依「Use a pure byte parser with no native dependency」實作bounds-safe PNG/JPEG/WebP parser與tagged results；驗證：所有pure fixtures通過、fuzzed short buffers不throw、server package無新增native dependency。

## 2. Route gate 與 cleanup

- [x] 2.1 在 `apps/server/src/routes/images.test.ts`先加入negative persistence assertions，交付「Filename extension, declared MIME, and detected type agree」；驗證：每種mismatch回400，uploads與image_assets計數不變，response無path/buffer/stack。
- [x] 2.2 依「Enforce type agreement and fixed dimension budgets」及「Validate before writes and preserve cleanup」把validator接在任何filesystem/DB write前，stored mime使用detected type；驗證：「Existing compressed-size and cleanup contracts remain active」tests覆蓋10 MB與post-write DB failure cleanup。

## 3. Compatibility 與完整驗證

- [x] [P] 3.1 更新 `README.md`列出三格式、10 MB、8192單邊、33,177,600 pixels與MIME一致規則；驗證：文件read-back能預測五類400 input且不宣稱full decode。
- [x] 3.2 對現有production image assets跑compatibility corpus，並執行focused parser/route、image playlist/fallback/delete-reference tests、完整server tests與build；驗證：既有合法assets全通過、新invalid fixtures全拒絕、commands exit zero。
