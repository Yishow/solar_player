## Why

管理面目前能修改 MQTT broker/topics、weather、playback、circuits、images playlist 等正式行為，但大多只保留最新狀態。當現場畫面或數字異常時，operator 很難回答「什麼時間改了什麼、原本值是多少、能不能安全回上一版」。系統也沒有 named user accounts，因此更需要忠實記錄它真正能辨識的 actor class/session，而不是用不存在的使用者名稱冒充稽核。

## What Changes

- 新增 settings change history，對指定管理 domain 記錄時間、actor class/session fingerprint、來源、operation、before/after redacted diff、結果與 correlation id。
- 第一階段涵蓋 MQTT broker/topics、weather、playback settings/pages、circuits、image playlist/settings；架構允許 display page/其他 domain 後續接入。
- 密碼、access token、CWA authorization 等 secrets 不寫入 audit diff 或 rollback payload；secret欄位只記「changed/preserved」。
- 管理頁提供時間/domain/filter/detail，並可先預覽 rollback 將改哪些非 secret 欄位。
- rollback 以 current revision/precondition 防止覆蓋較新的變更；rollback 本身是一筆新的 audited mutation，不刪除歷史。
- 對無法識別真人的操作顯示 `management-session`、`access-token` 等可驗證 actor class，不杜撰帳號姓名。

## Non-Goals

- 不在本 change 建立多使用者 RBAC/SSO。
- 不保存可還原的明文 MQTT/CWA secrets。
- 不允許繞過 domain validation 強行回滾到已不合法的舊資料。

## Capabilities

### New Capabilities

- `settings-change-history`: 管理設定 mutation 的 redacted audit history、diff、concurrency-safe rollback preview/apply 與 actor provenance。

### Modified Capabilities

（無）

## Impact

- Affected specs: new `settings-change-history`
- Affected code: management mutation wrapper/audit service、domain adapters、new routes、management history UI、shared types與 tests。
- Affected data: 新增 audit event table/indexes；可能需保存非 secret rollback snapshot/patch。
- Integration: `add-data-health-and-operator-alerting` 可把重要 setting events投影為 trend annotations，但 audit仍是唯一設定歷史真相來源。
