## 1. 建立 guarded-refresh contract

- [x] [P] 1.1 交付 Offline, Device Status, and Brand Assets preserve protected state during background refresh，並落實 decision 1: minimal fault lane is protected：在 apps/web/src/pages/OfflineError/index.tsx 固定 reconnect / return routing / minimal fault lane 的 protected 邊界，並以 offline tests 驗證 deferred refresh 不覆蓋主 lane。
- [x] [P] 1.2 交付 Offline, Device Status, and Brand Assets preserve protected state during background refresh，並落實 decision 2: access and partial-success state is protected：在 apps/web/src/pages/DeviceStatus/index.tsx 固定 access-denied / partial-success / safe-op guidance 邊界，並以 device tests 驗證 refresh 不覆蓋 protected lane。
- [x] [P] 1.3 交付 Offline, Device Status, and Brand Assets preserve protected state during background refresh，並落實 decision 3: dirty draft and pending action state is protected：在 apps/web/src/pages/BrandAssets/index.tsx 與 apps/web/src/pages/BrandAssets/loadModel.ts 固定 dirty draft、selection、pending action 邊界，並以 brand tests 驗證 background refresh 不覆蓋未儲存變更。

## 2. 鎖定安全語意

- [x] 2.1 交付 Offline, Device Status, and Brand Assets preserve protected state during background refresh：以 reconnect、safe operations、access-denied、dirty draft focused tests、spectra analyze、與 spectra validate 驗證受保護狀態不退化。
