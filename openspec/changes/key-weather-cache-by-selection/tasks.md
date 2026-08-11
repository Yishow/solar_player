## 1. Selection-scoped cache

- [ ] 1.1 新增 canonical weather selection key helper 與 tests。
- [ ] 1.2 將 cached snapshot、last-success 與 expiry 改成 selection-scoped bounded cache。
- [ ] 1.3 確保 stale fallback 只使用同 selection 的 last-success。

## 2. Settings and preview integration

- [ ] 2.1 weather preview 以 pending selection key 查詢，不得沿用不同地點 cache。
- [ ] 2.2 location save 後 invalidates 不相容 active cache；manual refresh 僅刷新 saved selection。
- [ ] 2.3 補 county↔station、station A↔B、upstream failure/stale fallback tests。

## 3. Verification

- [ ] 3.1 跑 weather service/route、MQTT Settings weather hooks/view-model targeted tests。
- [ ] 3.2 跑 root `pnpm test`、`pnpm build` 與 `pnpm verify`。
