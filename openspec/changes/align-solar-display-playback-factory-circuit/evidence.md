# Factory Circuit Evidence

## Scope Review

- Change: `align-solar-display-playback-factory-circuit`
- Route scope:
  - `/factory-circuit`
- Out of scope:
  - `/overview`
  - `/solar`
  - `/images`
  - `/sustainability`

## Fresh Verification

1. `pnpm --filter @solar-display/web test -- src/pages/FactoryCircuit/viewModel.test.ts src/layouts/offlineRouting.test.ts`
   - Result: pass (`15/15`)
2. `pnpm --filter @solar-display/web build`
   - Result: pass

## Route Evidence

- Prototype source:
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html`
- Current-route screenshot:
  - `artifacts/umbrella-final-fhd/03-factory-circuit.png`
- Manual review:
  - current-route screenshot 已保存進 umbrella walkthrough bundle，對應 flow-heavy playback batch。
  - page number `3/14`、shared footer rail 與 playback shell family 維持一致。

## Behavior Preservation

- `buildFactoryCircuitRuntimes()` tests 確認 circuits 依 prototype slot order 呈現。
- `buildFactoryCircuitViewModel()` tests 確認 threshold / status / empty-state mapping 集中，沒有散落在 JSX。
- offline routing test 再次確認 playback contract 沒因版型遷移而回歸。
