# R9–R10 implementation evidence

## Baseline

- Worktree: `/Users/yishow/prj/solar_player`; local `main` / HEAD `feb1ee33`.
- `rtk git ls-remote origin refs/heads/main`: `eebfc62e5c08cb58770e060d23b471ac6420673a`.
- Initial WIP: only the untracked change directory. No application edits were present.
- Period-consumer consistency is already integrated and archived at `openspec/changes/archive/2026-09-08-fix-energy-period-consumer-consistency/`.

## RED evidence

- UI worker's initial routed RED: `rtk pnpm --filter @solar-display/web test src/pages/DataHub/SiteEnergySetupJourney.test.tsx` → 0 PASS / 3 FAIL; baseline had no coverage checkbox and subsequent steps hit `null.click`. Permanent-409 regressions later went 5 PASS / 5 FAIL → GREEN; preview-version-conflict regression went 10 PASS / 1 FAIL → GREEN.
- `rtk pnpm --filter @solar-display/server test src/routes/site-energy-profiles.test.ts`: 2 pass / 3 fail. All three new R9 cases fail with `Cannot read properties of null (reading 'period')`, proving the real preview route still returns a null calculator for complete readings, missing baseline and a different draft timezone. Existing source conflict and authorization tests pass.
- `rtk pnpm --filter @solar-display/server test src/routes/site-energy-readiness-publishing.test.ts`: 0 pass / 2 fail. Both assertions expected `ENERGY_PROFILE_INCOMPLETE` for an assigned KN overview and instead found no blocker (`false !== true`). Fixtures cover one cumulative observation with stored `ready`, and complete observations with a midmonth effective profile. The earlier harness run used the wrong response nesting and is excluded from regression evidence; the corrected run reads `validation.findings`.
- The expanded publishing suite adds a changed source revision with only the old revision's endpoints: 0 pass / 3 fail, all at the expected missing-blocker assertion.

## Completion boundary

Task 3.2 includes user acceptance; screenshots alone do not satisfy that requirement. No production database, MQTT broker, deployment or commit is claimed here. On 2026-09-08 the user explicitly directed the change to be archived without completing that manual acceptance; `tasks.md` records this exception.

## Review disposition

- Standards: extracted unchanged profile reads/deserialization into `siteEnergyProfileRepository.ts`; period/readiness no longer import the authoring service. Root reread the extraction and callers.
- Standards: both evidence assemblers use the same shared period/share arithmetic and one readiness policy. Their orchestration remains separate because draft calculation failures must return explicit errors, while persisted reads retain effective-profile boundaries and fail-closed diagnostics. No second formula was introduced.
- Standards: the panel crossed the line-count review signal. The review renderer was extracted; remaining form/request state belongs to one wizard. A broader hook/component rewrite was not required.
- Spec: fixed withdrawal of denominator confirmation, permanent preview-conflict recovery, and unknown denominator kind validation. Root also reproduced an invalid stored denominator bypassing publish readiness, then made readiness use the shared structural validator.
- Spec: review now shows source names with channel identity, denominator kind, effective time, and actionable missing-baseline/stale-endpoint copy. Other diagnostics remain available separately.
- Existing wider-spec debt: current-consumer impact discovery and legacy/custom-binding migration are absent in baseline `feb1ee33` preview/apply. This named R9–R10 delta does not implement that separate E6/U6 contract and does not claim full E6/U6 completion. GET returns fresh readiness; a dedicated continuously refreshed management status view is outside this wizard change.
- Audit: submitted ready is not authoritative; default site-main works with explicit confirmation; unknown basis kinds fail validation; source/revision/canonical/idempotency checks remain. No client flag bypasses the persisted resolver's revision guard.

## Additional RED evidence and fixes

- Root independently replayed the current routed `profile=null` scenario against the unchanged `feb1ee33` panel in `/private/tmp/site-energy-ui-baseline-ciammsef`: `rtk proxy pnpm exec tsx --test --test-name-pattern='routed profile=null' src/pages/DataHub/SiteEnergySetupJourney.test.tsx` → 0 PASS / 1 FAIL, missing coverage-review control (`null.click`). This is a post-implementation baseline confirmation, not a claim about test order. An earlier mirror run missing its inherited tsconfig is excluded as harness-only failure.
- A future-draft regression initially returned HTTP 200 / revision 2 for an unreviewed future draft because the old effective profile was ready. Apply now checks the new draft before any revision insert; the regression passes with zero profile/receipt changes.
- Routed confirmation withdrawal initially failed `withdrawing confirmation must block apply` (`false !== true`); `canApply` now requires the live checkbox.
- Unknown `shareBasis.kind` initially returned HTTP 200 and issued a token; it now returns 422 with field diagnostics and zero token/profile/receipt writes.
- A malformed persisted basis initially bypassed publish blocking (`false !== true`). Shared structural validation now blocks the same scenario.
- First root `pnpm verify` found one old publishing fixture treating stored ready as sufficient. The fixture now supplies real reviewed KN source/endpoints and preserves assigned-site-only assertions. Focused result: 33/33 PASS before rerunning the full gate.

## Isolated rendered witness

- Actual built web UI plus real Fastify routes and migrated temporary SQLite at `http://127.0.0.1:4318`; named browser `solar-energy-readiness`. No production DB or broker connection.
- Harness: `/private/tmp/site-energy-readiness-witness.mts`; seed main 1000→1400, department 1000→1100, missing-baseline source without opening observation. MQTT publish is trapped and counted.
- Browser operations cover new KN and CL retaining site-main, existing-profile re-preview, missing baseline, and source changes before apply. Both settings were saved in the isolated DB. Initial counters: MQTT publishes 0, one profile revision per site, two receipts.
- KN numeric review: 400 kWh total / 100 kWh numerator / 25%. CL initially showed stale-endpoint waiting and returned to numeric readiness after fresh accepted data. Midmonth activation correctly saved waiting for its persisted period boundary.
- The screenshots were AI-observed browser evidence, not user or playback/FHD/production acceptance. They were not retained in the archived change, so the observations below are not durable image evidence.

### Final screenshot batch

Rebuilt final UI and restarted the real backend harness with a fresh DB at `/var/folders/bq/zyknbs7n1xs99c08yprwqc9c0000gn/T/site-energy-readiness-witness-ICFMVR`. Seed time `2026-09-08T09:47:51.287Z`; viewport 1920×1080. Root opened and inspected all six PNGs.

| Scenario | Review asOf (UTC) | Evidence |
| --- | --- | --- |
| New KN, default denominator | 09:48:09.188 | Image not retained |
| Existing KN, re-preview after apply | 09:48:27.997 | Image not retained |
| KN source changed before apply | after 09:48:27.997 | Image not retained |
| New CL, default denominator | 09:48:52.485 | Image not retained |
| Existing CL, re-preview after apply | 09:48:53.602 | Image not retained |
| CL missing opening baseline | 09:49:07.836 | Image not retained |

Both final new-site previews show 400/100/25%; both apply responses save configured-awaiting-data because their effective time is midmonth. Missing-baseline review shows null total/basis/share, department 100, and actionable waiting copy. Source conflict produces no second revision or receipt. Final counters: MQTT 0, profiles KN r1 / CL r1, tokens 5, receipts 2, production projections 0, daily summaries 0.

## Final verification commands

- PASS: `rtk proxy pnpm verify > /private/tmp/site-energy-readiness-verify-final.log 2>&1` — exit 0 after final application changes. All seven stages passed: build, bundle-budget, shared (162), server (970), web (1458), deploy (110 PASS / 1 SKIP), server-runner (14). No failed tests.
- PASS: `rtk pnpm --filter @solar-display/server test src/routes/site-energy-profiles.test.ts src/routes/site-energy-readiness-publishing.test.ts src/services/siteEnergyProfileService.test.ts src/services/siteEnergyProfileSourceReview.test.ts src/services/energyAuthoringJourney.test.ts src/routes/energy-authoring-consumers.test.ts` — 28/28.
- PASS: `rtk pnpm --filter @solar-display/web exec tsx --test src/pages/DataHub/SiteEnergySetupJourney.test.tsx src/pages/DataHub/SiteEnergySetupPanel.test.tsx` — 16/16, personally rerun by root after final worker changes.
- PASS: before archive, `rtk spectra validate /Users/yishow/prj/solar_player/openspec/changes/fix-site-energy-preview-readiness --strict --json` returned no errors or warnings.
- NOT RUN: production deployment, live MQTT, device launch and playback FHD acceptance. Playback visual implementation was not changed.
- The deploy skip is `real flock releases the monitor slot without leaking it to Firefox`; it is not counted as a passed runtime witness.

## Post-review remediation

- Fixed the client confirmation boundary to accept only `ready` and `configured-awaiting-data`; an unknown runtime readiness status now invalidates the preview and cannot reach apply.
- Preview and persisted readiness now share `profileEvidence.ts` for period, basis, channel, department and share assembly. Persisted resolution keeps its fail-closed boundary context while draft preview keeps explicit calculator failures.
- PASS: focused server profile/readiness suites, 26/26.
- PASS: focused routed web journey and panel suites, 17/17, including the unknown-readiness regression.
- PASS: shared suite, 162/162; `rtk proxy git diff --check`; `rtk spectra validate --specs --strict --json`.
- PASS: final `rtk pnpm verify`; build, bundle-budget, shared, server, web (1459), deploy (110 PASS / 1 SKIP), and server-runner (14) all completed without failures.

## Checkpoint and remaining work

- Base HEAD: `feb1ee33`; no staging, commit, merge or push.
- The pre-archive checkpoint `/private/tmp/fix-site-energy-preview-readiness-checkpoint/` does not represent the current archived worktree.
- Post-review checkpoint: `/private/tmp/fix-site-energy-preview-readiness-post-review-checkpoint-20260908/` records the archived worktree after review fixes.
- Task 3.2 remains open for user acceptance. The user explicitly overrode the original 3.3 archive sequence and directed immediate archive; commit still requires separate confirmation.
