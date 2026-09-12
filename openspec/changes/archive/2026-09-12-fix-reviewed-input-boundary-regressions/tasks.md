## 1. 獨立修正與回歸

- [x] [P] 1.1 完成 Route 與 params 驗證：Management numeric resource identifiers are parsed strictly；raw HTTP 反斜線在四類 covered route 回 400 且 DB／檔案／事件不變，先記錄 RED 再修正，focused server tests 通過；抽出共用 helper 並確認 runtime partial update 與 playlist 相容性。
- [x] [P] 1.2 完成 Canonical sidecar key：Corrupt identity state fails explicitly instead of silently renumbering；拒絕非 canonical serial／position 與正規化重複 keys，先記錄 RED 再修正，確認 sidecar bytes 不變；共用 helper 收斂 service／once Prepare 入口，Go tests 與 go vet 通過。

## 2. 整合與收尾

- [x] 2.1 主代理 review 最後 source、diff、規格與兩項 RED／GREEN 證據，修正範圍內 findings；確認共用 helper 未改變合法 numeric IDs、sidecar authority、history floor、SQLite disabled 行為。
- [x] 2.2 最終版本執行 pnpm verify、Go 全套 tests／vet、git diff --check 與 Spectra analyze／validate；明列未執行實機驗證。
- [x] 2.3 核對 harden-runtime-input-boundaries 原 tasks、delta 與 final gate 後完成該既有 change 的 spec sync／archive，保留 index 與無關 WIP；回讀 main specs，確認本修正 change 的完成證據與歸檔條件，準備 checkpoint。
