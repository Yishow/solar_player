## 1. Pure runtime playlist resolution

- [ ] 1.1 調整 `apps/server/src/services/imagePlaylistService.ts`，把 runtime resolved playlist 與 governance row bootstrap 分成兩條責任清楚的讀取路徑，落實 `Keep runtime image playlist reads side-effect free`。對應 design topic: decision: runtime read resolves an ephemeral playlist view instead of persisting missing rows.
- [ ] 1.2 更新 `apps/server/src/routes/image-playlist.ts` 與 `apps/web/src/services/api.ts`，讓播放端預設只走純讀 contract，不再依賴 `bootstrap=true` query side effect。對應 design topic: decision: preserve the existing runtime payload shape when rows are absent.

## 2. Explicit governance bootstrap

- [ ] 2.1 保留並收斂 `POST /api/image-playlist/governance/bootstrap` 的責任，讓治理 rows 建立只發生在顯式 management action，落實 `Bootstrap governance rows only through an explicit management action`。對應 design topic: decision: governance bootstrap remains an explicit management action.
- [ ] 2.2 調整 `apps/web/src/hooks/useImagePlaylistRuntime.ts`、`apps/web/src/pages/Images/index.tsx` 與 management/bootstrap flows，確保 runtime hydration 與 governance authoring 不再混用同一路徑。

## 3. Verification

- [ ] 3.1 補齊 server / web tests，覆蓋 zero-write runtime read、顯式 bootstrap 建 row、無 rows 時 runtime 仍可解析可播放結果。
- [ ] 3.2 執行 `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 與 `spectra analyze remove-image-playlist-read-bootstrap-side-effects`。
