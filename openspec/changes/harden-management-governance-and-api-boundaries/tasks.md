## 1. Access boundary

- [x] 1.1 實作 `Protect management mutation APIs with a shared access boundary`，落實 `secure mutations first, not every read route`。
- [x] 1.2 將 server CORS 與 route guards 對齊單一 policy，落實 `use a single management access mechanism`，避免 `origin: true` 全開。

## 2. Surface governance

- [x] 2.1 盤點所有 mutable management pages，實作 `Apply shared draft governance across mutable management surfaces`，至少涵蓋 `BrandAssets`。
- [x] 2.2 對 destructive actions 增加 operator-facing audit or confirmation state，落實 `apply shared draft governance to all mutable management pages`。

## 3. Verification

- [x] 3.1 補 server tests，覆蓋未授權 mutation、trusted origin 與 local operator happy path。
- [x] 3.2 補 web tests，確認 shared dirty-state governance 不會回歸。
