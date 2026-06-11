## 1. 建立 Playback Settings isolation boundary

- [x] [P] 1.1 交付 Playback Settings keeps the editable form stable during tick and preview updates，並落實 Editable form tree is isolated from tick updates：在 apps/web/src/pages/PlaybackSettings/index.tsx 收斂 countdown / progress subtree，並以 component tests 驗證 tick update 不重組 form。
- [x] [P] 1.2 交付 Playback Settings keeps the editable form stable during tick and preview updates，並落實 Preview rail stays outside the editable lane：在同一頁面與 apps/web/src/pages/PlaybackSettings/loadModel.ts 固定 preview subtree 邊界，並以 preview-focused tests 驗證 preview refresh 不重組 page rows。

## 2. 鎖定 save / sync 行為

- [x] 2.1 交付 Playback Settings preserves existing save and sync behavior while isolated lanes update，並落實 No-regression save and sync behavior：以 save、reorder、display sync focused tests、spectra analyze、與 spectra validate 驗證功能不退化。
