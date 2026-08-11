## Context

管理 routes目前各自直接寫 DB/emit sync。若在每條 route手工加 log，容易漏寫、格式漂移或把 secrets誤塞入 JSON。又因目前 authentication是 management session/access token而不是 named accounts，actor只能可靠辨識為 credential/session class與匿名 fingerprint。

## Goals / Non-Goals

**Goals:**

- 所有 in-scope management setting mutations留下可查、不可被一般 UI刪除的 audit record。
- audit diff絕不保存明文 secret。
- operator可預覽並安全 rollback非 secret設定。
- rollback尊重目前 domain validation與 concurrent change precondition。

**Non-Goals:**

- 不建立完整 IAM/user directory。
- 不把 raw request body無條件存檔。
- 不讓 audit rollback還原 secret credential；secret維持目前值，除非 operator另行明確輸入。

## Decisions

### Domain adapter 負責 canonical snapshot、redaction 與 apply

建立 audit coordinator與 per-domain adapter。Adapter定義 `readCanonicalState()`, `redactForAudit()`, `buildRollbackCandidate()`, `validateAndApply()`。Route mutation在成功 transaction周圍呼叫 coordinator，避免 central layer猜測每個 domain schema。

### Audit record 保存 redacted diff + rollback-safe state

Record包含 event id、domain、action、actorClass、actorFingerprint（不可反推出 token）、origin/remote class 的 bounded metadata、occurredAt、beforeRevision、afterRevision、redactedDiff、status/correlationId。Rollback所需 snapshot只保存非 secret canonical fields；secret field以 marker表示 preserve-current。

### Actor 誠實呈現可知資訊

Management session token只做 salted/rotating fingerprint或使用 session row id，不保存 token本身。Access-token request標 `access-token` actor class並同樣不存 token。若未來有 named identity，可新增 actorId/label，不 retroactively猜人名。

### Rollback 是新的 mutation

Operator選一筆歷史後先取得 preview：target values、會保留的 secrets、目前 revision、validation結果。Apply時必須帶 expected current revision；不一致回 conflict，要求重新 preview。成功 rollback走原 domain validator/sync，並寫一筆 action=`rollback` audit record linking sourceEventId。

## Implementation Contract

- in-scope mutation成功後必有 audit event；失敗 mutation可記 bounded failed attempt，但不能把未保存的 raw secrets寫入。
- MQTT password/CWA authorization/access tokens在任何 audit API/DB JSON中不可出現原值。
- rollback MQTT非 secret broker fields時保留 current password，除非另有明確 credential update。
- concurrent新變更發生後，舊 preview直接 apply必須 409/conflict。
- audit UI不可提供刪除歷史按鈕；retention/archival由明確 policy管理。

## Migration Plan

新增 audit tables/indexes，不回填過去變更。Domain adapter逐一接入，可用 feature flag/coverage test確保清單內每個 mutation route都有 audit hook。Rollback功能在該 domain adapter通過 round-trip/validation tests後才開啟。

## Risks / Trade-offs

- [Risk] audit hook失敗阻擋正式設定保存 → 對 governance設定採 transactionally coupled或 fail-closed策略；若特定非關鍵 event允許 async，必須在 spec另列，不可靜默漏記。
- [Risk] snapshot含敏感欄位 → per-domain allowlist而非 denylist，secret leakage test掃描典型值。
- [Risk] rollback舊設定已不符合新規則 → preview顯示 validation failure，不提供 bypass。
