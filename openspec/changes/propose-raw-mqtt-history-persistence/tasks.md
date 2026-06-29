## 1. 規格收斂

- [ ] 1.1 Deliver `Persist raw MQTT messages as a separate local audit lane` by following `Keep raw MQTT history as a parallel persistence lane`, and verify by spec/design review in `openspec/changes/propose-raw-mqtt-history-persistence/`.
- [ ] 1.2 Deliver `Bound retention and query scope for raw MQTT history` by following `Bound retention and querying from the start`, and verify by spec/design review in `openspec/changes/propose-raw-mqtt-history-persistence/`.
- [ ] 1.3 Deliver `Protect sensitive payload content in operator-facing access` by following `Preserve sensitive-data and operator-surface boundaries`, and verify by spec/design review in `openspec/changes/propose-raw-mqtt-history-persistence/`.

## 2. 後續 implementation handoff

- [ ] 2.1 Turn this proposal into an implementation-ready change plan that names migrations, ingest hooks, retention jobs, and query surfaces, and verify with `pnpm -s exec spectra analyze propose-raw-mqtt-history-persistence --json`.
