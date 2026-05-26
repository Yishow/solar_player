# FHD Exception Ledger Template

日期：2026-05-27

這份 exception ledger 用來記錄所有偏離 witness 的持久 evidence，而不是把理由留在 chat。

## Exception Ledger

| ID | Witness batch | Surface family | Affected surface | Protected attribute | Reason | User-visible effect | Residual risk | Verification pack |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ex-001` | `overview-solar-playback` | `playback` | `/solar` hero photo | `Photo fade` | Data source limits | Fade edge is looser than witness | Review may over-accept softer edge treatment | `web test + manual witness check` |

## Required Fields

- `affected surface`
  - 哪個頁面、區塊或 shared chrome 被偏離。
- `reason`
  - 為什麼不能完全跟 witness 一樣。
- `user-visible effect`
  - 使用者或 reviewer 會直接看到什麼差異。
- `residual risk`
  - 這個偏離可能留下的後續風險。
- `verification pack`
  - 哪些 commands 或 manual checks 會再次確認這個例外仍然可接受。

## Usage Notes

- 每個 exception 都要對應一個 `witness batch`
- 每個 exception 都要掛在一個 `surface family`
- 若 exception 其實跨兩個 family，通常代表 change 應該拆開
