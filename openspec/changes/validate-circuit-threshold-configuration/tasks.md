## 1. Authoritative validation

- [ ] 1.1 建立完整 circuit threshold candidate/validation helper。
- [ ] 1.2 create path 套用 defaults 後 validate，invalid 回 bounded 400 且 zero-write。
- [ ] 1.3 update path 合併 existing + patch 後 validate，invalid 不發 sync event。

## 2. Management feedback

- [ ] 2.1 Circuit Settings form 加同規則的即時 field/range提示。
- [ ] 2.2 載入既有 invalid row 時顯示需要修正狀態，不自動改寫。

## 3. Verification

- [ ] 3.1 新增 negative、non-finite、每種 boundary inversion、partial-patch conflict、equal-boundary tests。
- [ ] 3.2 跑 circuits route與 Circuit Settings targeted tests。
- [ ] 3.3 跑 root `pnpm test`、`pnpm build` 與 `pnpm verify`。
