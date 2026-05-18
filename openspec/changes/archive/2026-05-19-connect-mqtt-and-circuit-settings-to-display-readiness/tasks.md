## 1. MQTT coverage

- [x] 1.1 Deliver `Evaluate MQTT settings coverage against display metric requirements` and reference `Evaluate readiness from display requirements, not only raw settings presence` by computing readiness findings from required display metrics and topic mappings, verified by `pnpm --filter @solar-display/server test` coverage for missing and invalid mappings.
- [x] 1.2 Deliver `Surface MQTT coverage findings inside MQTT Settings` by rendering display coverage findings on the MQTT settings page, verified by targeted web tests or manual inspection of `/settings/mqtt`.

## 2. Circuit slot binding

- [x] 2.1 Deliver `Store circuit-to-display slot binding explicitly` and reference `Store circuit-to-display mapping explicitly` by persisting explicit slot assignments for display stories, verified by targeted server tests and shared model assertions.
- [x] 2.2 Deliver `Surface unbound or conflicting display slot assignments in Circuit Settings` by showing missing or conflicting slot findings in the circuit settings page, verified by targeted web tests or manual inspection of `/settings/circuits`.

## 3. Shared readiness checks

- [x] 3.1 Deliver `Evaluate display readiness checks from MQTT and circuit configuration` and reference `Surface readiness findings inside settings pages` by adding a reusable readiness service that reports blocking and warning findings, verified by targeted server tests.
- [x] 3.2 Deliver `Reuse display readiness checks across management surfaces` by exposing the same readiness output to other management routes or APIs, verified by integration-style tests that compare readiness responses across surfaces.
