## 1. Brand runtime invalidation contract

- [ ] 1.1 在 `apps/server/src/routes/brand.ts` 與 shared contract 中明確整理 active-brand runtime payload，直接落實 `Keep playback runtime brand hydration scoped to the active brand payload`。對應 design topic: decision: hydrate playback brand state from the active brand contract only.
- [ ] 1.2 調整 `apps/server/src/realtime/SocketService.ts` 或既有 display-sync wiring，直接落實 `Propagate active brand updates to all connected playback sessions`。對應 design topic: decision: reuse the existing `display:sync` brand scope as the cross-session invalidation signal.

## 2. Playback hook refresh wiring

- [ ] 2.1 調整 `apps/web/src/hooks/useBrandAssets.ts` 與 `apps/web/src/services/api.ts`，讓 playback hook 在 brand signal 到達時原地 refresh brand view，而不是做 full-page reload。對應 design topic: decision: refresh brand view in place instead of reloading the whole playback shell.
- [ ] 2.2 保留 `apps/web/src/pages/BrandAssets/index.tsx` 的同頁 optimistic feedback，但把實際同步入口統一成 server-driven refresh path，避免 local event 與 socket signal 分叉，並確保 remote playback session 也會收到同一份 brand invalidation。

## 3. Verification

- [ ] 3.1 補齊 server / web tests，覆蓋 active brand 變更會觸發 invalidation、remote playback session 會 refresh header、refresh failure 會保留上一個可用 brand view。
- [ ] 3.2 執行 `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 與 `spectra analyze propagate-brand-runtime-updates-across-playback-sessions`。
