# Verification Record

## Baseline

- Date: 2026-09-09 (Asia/Taipei)
- Review baseline and implementation `HEAD`: `abd99ba846c25de35100229452e17e2442552a10`; the first two requested changes are present only as uncommitted work and must be preserved.
- D1 remains applicable: draft parsing drops configured scope and later matches only `metricKey`, so a KN draft can incorrectly block a same-named CL source.
- D2 remains applicable: invalid draft JSON is caught and returned as an empty binding set, so unreadable dependency evidence is treated as known-empty instead of the existing unknown-impact branch.
- Boundary: preserve the public consumer/error shapes, existing destructive-transition definition, registered-expectation classification, persisted draft bytes, database schema, and both routes' shared guard.

## Acceptance boundary

- Required local evidence: scope and parser-state matrices, direct and guided zero-side-effect regressions, focused server tests, final repository gate, strict Spectra validation, Standards review, and Spec review.
- Not claimed: live broker, browser acceptance, deployment, production, LAN, or field acceptance.

## Results

### TDD and focused verification

- RED: the initial D1/D2 regression set ran 7 tests with 3 passing and 4 failing. Failures showed explicit cross-scope bindings being matched by key alone and malformed draft surfaces being reported as known-empty.
- GREEN: `pnpm --filter @solar-display/server test src/services/sourceImpactService.test.ts src/routes/meter-sources.test.ts src/services/guidedMqttMappingService.test.ts src/routes/mqtt-guided-activation.test.ts src/routes/source-impact-mutation.test.ts` — PASS, 59 tests, 0 failures.
- `pnpm --filter @solar-display/server build` — PASS, including the shared pretest build.
- `git diff --check` — PASS.

The final tests independently cover explicit CL/KN/global/all matching, inherited-device and omitted legacy scopes, malformed JSON and invalid root/regions/dataBindings/item/binding/key/scope structures, valid empty forms, and unchanged persisted bytes. Direct and guided route tests cover same-scope/unknown rejection, different-scope acceptance, dependency changes after preview, HTTP 409 classification, and zero source/mapping/audit/receipt/runtime side effects. Existing registered-only, live/derived dependency, replay, and ownership-classification tests remain green.

### Final closeout

- Fresh Standards review — PASS after the combined review findings were resolved; no remaining actionable P0-P3 finding.
- Fresh Spec review — PASS; explicit and inherited scope semantics, valid-empty versus unreadable parsing, shared guard use, and zero-write rejection match the delta spec.
- Final `pnpm verify` — PASS. All stages passed: build, bundle-budget, shared (166/166), server (1064/1064), web (1472/1472), deploy (110 passed, 1 skipped), and server-runner (14/14).
- `openspec validate fix-source-impact-scope-and-unknown-handling --strict` — PASS; final tasks and verification were read back after update.
- D1/D2 closeout evidence is recorded in `docs/reviews/2026-09-09-source-runtime-followup-review.md`.

The change remains active and uncommitted. No deployment, production, LAN, or field acceptance is claimed.
