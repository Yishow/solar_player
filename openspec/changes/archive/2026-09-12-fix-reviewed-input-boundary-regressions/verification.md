# 修正驗證紀錄

驗證日期：2026-09-12。修正基準：`13c5ae0b11936d382c5fda1bd157d55003665697`；原 review 自 `e7776da8e37641b1dcc990adaf0a36f39ccf8f2d` 起。未建立 commit。

## 缺陷與回歸證據

- 修正前：實際 HTTP `PUT /api/circuits/12\abc` 回 200 並更新 circuit 12。修正後：十個 covered management routes 的 raw HTTP malformed IDs 均回 400，DB、檔案內容、目錄、playlist 與 socket events 不變；playlist 的 malformed dynamic ID 回 404，無副作用。
- 修正前：sidecar `serial: A `、`serial:A `、`position:01`、`position:+1` 可通過 Open，與 resolver 產生的 key 不一致。修正後：非 canonical 與正規化重複 keys 明確失敗；Open 與共用 Prepare 的失敗均保留 sidecar bytes。
- 主代理回讀最終 source、diff、規格與測試；Standards／Spec 平行複核無剩餘 finding。確認合法 IDs、sidecar authority、SQLite disabled、history floor、MQTT partial update／mask／reconnect zero 與 playlist 相容性。

## 最終檢查

| 檢查 | 結果 |
| --- | --- |
| Server focused tests、TypeScript build | PASS：70 個 tests |
| Root `pnpm verify` | PASS：build、bundle-budget、shared、server、web、deploy、server-runner 全階段 |
| Root suites | shared 167 pass；server 1193 pass / 1 skip；web 1565 pass；deploy 129 pass / 1 skip；server-runner 14 pass；0 fail |
| Go `go test ./... -count=1` | PASS：16 packages；使用隔離 GOCACHE |
| Go `go vet ./...` | PASS |
| 本次範圍 `git diff --check` | PASS |
| Spectra validate | PASS：本 change 與 harden-runtime-input-boundaries |
| Spectra analyze | 無 Critical／Warning；1 個 Suggestion 為既有 collision scenario 可補具體範例 |
| 實機、部署與人工 acceptance | NOT RUN；本次無部署或 UI 行為變更 |

本機完整輸出：`/private/tmp/solar-review-fixes-verify.log`、`/private/tmp/solar-review-fixes-go-test.log`、`/private/tmp/solar-review-fixes-go-vet.log`。這些是本機測試證據，不代表 production 或實機驗收。歸檔與最終工作樹保留證據記於本次交付 checkpoint。
