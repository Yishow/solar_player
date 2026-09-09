# Verification Record

## Baseline

- Date: 2026-09-09 (Asia/Taipei)
- Review baseline and current `HEAD`: `abd99ba846c25de35100229452e17e2442552a10`; `origin/main` matched when implementation began.
- Initial tracked and staged worktree: clean. The follow-up review and the three requested Spectra change directories were untracked planning inputs.
- Applicable finding: `docs/reviews/2026-09-09-source-runtime-followup-review.md` D3. At this baseline, direct source POST/PUT/DELETE committed the source and synchronized mapping in `apps/server/src/routes/meter-sources.ts`, but did not reconcile the committed enabled generic topics with the production MQTT runtime after commit.
- Reproduced failure recorded by D3: a source disabled when the runtime connected could be enabled through the direct PUT endpoint with HTTP 200 and enabled persisted source/mapping, while the runtime made no new subscription and the topic remained inactive.

## Acceptance boundary

- Required local evidence: a real route plus real `MqttClientService` and controllable fake broker regression, focused server tests, final repository gate, strict Spectra validation, Standards review, and Spec review.
- Not claimed by this change: live broker, deployed device, production, LAN, or human/field acceptance.

## Results

### TDD and focused verification

- RED: before production wiring, the new real-route/runtime regression produced three failures: direct enable made no subscription, broker refusal produced no safe reconciliation warning, and the shared topic never entered the active set. The baseline route source also had no post-commit runtime call.
- GREEN: `pnpm --filter @solar-display/server test src/routes/meter-sources.test.ts src/routes/mqtt-guided-activation.test.ts src/mqtt/MqttClientService.test.ts src/services/guidedMqttMappingService.test.ts src/routes/meter-sources-runtime-reconciliation.test.ts` — PASS, 71 tests, 0 failures.
- `pnpm --filter @solar-display/server build` — PASS, including the shared pretest build.
- `git diff --check` — PASS.

The regression uses the production route, a real `MqttClientService`, and a controllable fake broker. It covers commit-before-subscribe and packet ingestion, broker refusal and same-revision retry, last/shared owner and managed-topic retention, no invented mapping, disconnected desired state and reconnect, controlled rapid callback convergence, and zero runtime calls for authorization, validation, stale revision, ownership, and dependency rejection.

### Final closeout

- Fresh Standards review — PASS after the combined review findings were resolved; no remaining actionable P0-P3 finding.
- Fresh Spec review — PASS; the commit-after-write reconciliation, complete desired-topic set, failure semantics, and unchanged public response contract match the delta spec.
- Final `pnpm verify` — PASS. All stages passed: build, bundle-budget, shared (166/166), server (1064/1064), web (1472/1472), deploy (110 passed, 1 skipped), and server-runner (14/14).
- `openspec validate fix-direct-source-runtime-reconciliation --strict` — PASS; final tasks and verification were read back after update.
- D3 closeout evidence is recorded in `docs/reviews/2026-09-09-source-runtime-followup-review.md`.

The change remains active and uncommitted. It has not been archived, deployed, or exercised against a live broker.
