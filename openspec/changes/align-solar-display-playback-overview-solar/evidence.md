# Overview And Solar Evidence

## Scope Review

- Change: `align-solar-display-playback-overview-solar`
- Route scope:
  - `/overview`
  - `/solar`
- Out of scope:
  - `/factory-circuit`
  - `/images`
  - `/sustainability`

## Fresh Verification

1. `pnpm --filter @solar-display/web test -- src/pages/Overview/viewModel.test.ts src/pages/Solar/viewModel.test.ts src/hooks/playbackRouteNavigation.test.ts src/hooks/playbackRouteSync.test.ts src/layouts/offlineRouting.test.ts`
   - Result: pass (`16/16`)
2. `pnpm --filter @solar-display/web build`
   - Result: pass

## Route Evidence

### `/overview`

- Prototype source:
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/01-overview.html`
- Current-route screenshot:
  - `artifacts/umbrella-final-fhd/01-overview.png`
- Manual review:
  - hero slogan、left headline block、right media panel、KPI rail 與 footer rhythm 已對位到 prototype family。
  - shell witness 同時確認 page number `1/14` 與 playback footer navigation 正常。

### `/solar`

- Prototype source:
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html`
- Current-route screenshot:
  - `artifacts/umbrella-final-fhd/02-solar.png`
- Manual review:
  - 已保存 current-route FHD screenshot，納入 umbrella walkthrough bundle。
  - flow / KPI composition 的 runtime correctness 仍由 page-local adapter tests 與 playback runtime tests 共同覆蓋。

## Runtime Contract Preservation

- `Overview` view model tests確認 live metrics 優先使用 socket snapshot，缺資料時回退到 fallback metrics。
- `Solar` view model tests確認 flow nodes、KPI display fields 與 fallback rendering 集中在 page-local adapter。
- playback runtime tests 重新確認：
  - route rotation 沒回歸
  - offline redirect 沒回歸
  - route-runtime sync 沒回歸
