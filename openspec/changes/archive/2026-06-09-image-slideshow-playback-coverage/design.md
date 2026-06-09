## Context

整頁輪播由 `usePlaybackController` 依每頁 `durationSeconds` 倒數換頁；各頁的 `durationSeconds` 由 server 在組裝 rotation pages 時提供（`displayRotationService`，預設來源為 display page registry 的 duration_seconds，images 頁目前 5 秒）。Images 頁內部另有 `useImagesAutoplay`，依每個 playlist entry 的 `durationSeconds` 無限循環切換圖片，與整頁輪播彼此獨立。

因此 images 頁只停留固定的 registry 秒數（5 秒），與「啟用幾張圖、每張幾秒」完全無關 → 上傳/啟用再多圖，整頁也在播完第一張前就換頁。每張秒數的 per-entry 設定已存在於 ImageManagement，但沒有任何機制讓 images 頁停留到整個 playlist 播完一輪。

現況事實（已查證）：
- server 端可用 `imagePlaylistService.readImagePlaylist()` 取得 resolved entries（含 `durationSeconds`、`enabled`、`isPlayable`），且該讀取為 runtime 純讀取（capability：image-playlist-runtime-read-purity）。
- `displayRotationService` 在組裝 rotation pages 時設定每頁 `durationSeconds`（無值時預設）。rotation preview 與 runtime 皆走同一組裝結果（控制器 `loadPlayback` 取 `getDisplayRotationPreview().playablePages`）。
- `useImagesAutoplay` 已會依 per-entry 秒數循環切換，毋須改動即可在較長的頁面 slot 內播完一輪。

## Goals / Non-Goals

**Goals:**

- images 頁的整頁停留秒數 = 啟用且可播的圖片 entry 秒數總和（張數 × 每張秒數），下限 1 秒，使每張啟用圖片在換頁前至少播放一次。
- 無啟用可播 entry 時，回退為 images 頁原本的 registry duration，行為不變。
- runtime 與 management rotation preview 使用同一個推導秒數，操作端看到與牆面一致的 slot 長度。

**Non-Goals:**

- 不改 per-entry 秒數/順序的 authoring（已存在）、不做 shuffle 或「一鍵設定全部秒數」（另開 change）。
- 不改 `useImagesAutoplay` 的內部切換邏輯。
- 不改其他頁的 duration、不動 broker-failure 韌性、換頁過場。
- 不對總秒數設人為上限（操作端透過張數與每張秒數自行控制）。

## Decisions

**決策 1：新增 shared 純函式計算 images playlist 總秒數。**
- 在 `packages/shared/src/imagePlaylist.ts` 新增純函式（例如 `resolveImagesPlaylistTotalDurationSeconds(entries)`）：加總 `enabled === true 且 isPlayable === true` 的 entry `durationSeconds`，下限 1；若無符合 entry 回傳 0（或 null）表示「無可播放，沿用 fallback」。
- 替代方案：在 server 直接 inline 加總。否決原因：放在 shared 可單元測試、且與既有 playlist resolve 邏輯同檔一致。

**決策 2：在 rotation pages 組裝處覆寫 images 頁的 durationSeconds。**
- 在 `displayRotationService` 組裝每頁 duration 時，對 templateKey 為 images 的頁，以決策 1 的總秒數覆寫 `durationSeconds`（總秒數 > 0 時）；否則沿用 registry duration。
- 因 rotation preview 與 runtime 同源，覆寫一處即同步生效。
- 替代方案：在 web `usePlaybackController` 對 images 頁特判停留。否決原因：會把 image-specific 邏輯散進通用播放控制器，且 preview 與 runtime 易不一致；server 單點覆寫較內聚。

## Implementation Contract

**行為（Behavior）：**
- 當 images playlist 有 N 個 enabled 且 playable 的 entry、各自秒數為 d_i 時，`/api/display-pages/rotation-preview` 與 runtime 取得的 images 頁 `durationSeconds` SHALL 等於 max(1, Σ d_i)。
- 當無 enabled 且 playable entry 時，images 頁 `durationSeconds` SHALL 等於其 registry 設定值（行為不變）。
- 整頁輪播因此停留足夠時間，使 `useImagesAutoplay` 在換頁前播完一輪所有啟用圖片。

**介面 / 資料形狀（Interface / data shape）：**
- 新增 shared 純函式：輸入 resolved image playlist entries（含 enabled、isPlayable、durationSeconds），輸出整數秒數（max(1, Σ) 或 0 表示無可播）。
- `displayRotationService` 對 images 頁的 `durationSeconds` 採覆寫；rotation pages 的其他欄位形狀不變。

**失敗模式（Failure modes）：**
- 無啟用可播圖片：回退 registry duration，不丟錯、不產生 0/NaN。
- playlist 讀取維持純讀取，不得在 rotation 評估期間寫入。

**驗收（Acceptance criteria）：**
- 新增 shared 單元測試（`packages/shared/src/imagePlaylist.test.ts`）：給定 entries（含 enabled/disabled、playable/不可播、不同秒數）→ 函式回 max(1, Σ enabled&playable 秒數)；全部停用 → 回 0（fallback 訊號）。
- 更新 server 測試（`apps/server/src/routes/display-pages.test.ts` 的 rotation-preview）：在已知 playlist 下，images 頁 `durationSeconds` 等於總和；空 playlist 時等於 registry 值。
- `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 全綠、`pnpm run build` 通過。

**範圍邊界（Scope boundaries）：**
- In scope：shared 總秒數函式、`displayRotationService` 對 images 頁 duration 的覆寫、相關測試。
- Out of scope：web autoplay 邏輯、ImageManagement UI、shuffle、bulk duration、其他頁 duration、broker 韌性、過場。

## Risks / Trade-offs

- [圖片很多時 images 頁停留過久、輪播失衡] → 屬操作端可控（張數 × 每張秒數即總秒數）；本 change 不設人為上限，必要時於後續評估上限或「分批」策略。
- [per-entry 秒數與整頁停留改由 playlist 推導，可能與既有對 images 頁固定 duration 的預期不同] → 以測試明確涵蓋；空 playlist 維持 registry 行為以降低衝擊。

## Migration Plan

- 純行為與測試變更，無資料庫 migration、無 API 形狀變更。
- 部署即生效；回滾僅需還原 shared 函式與 `displayRotationService` 覆寫。

## Open Questions

- 是否需要對 images 頁總秒數設上限或提供「整頁固定上限、超過則只播前幾張」的模式？（本 change 暫不做。）
