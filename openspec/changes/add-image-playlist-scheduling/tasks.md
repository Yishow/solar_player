## 1. Schedule model and resolver

- [ ] 1.1 新增 playlist schedule nullable columns/migration與 shared types。
- [ ] 1.2 實作 canonical schedule validation與 shared eligibility resolver。
- [ ] 1.3 支援 start/end、repeat days、normal/overnight daily windows與 exclusion reason。

## 2. Runtime and offline

- [ ] 2.1 runtime playlist只把當下 eligible entries交給 autoplay/shuffle。
- [ ] 2.2 schedule edge在 slide safe boundary套用並更新 cycle signature。
- [ ] 2.3 offline snapshot保存 schedule；time-untrusted時 scheduled entries fail closed。

## 3. Management authoring

- [ ] 3.1 Image Management新增 entry schedule editor/validation。
- [ ] 3.2 新增指定 future date/time 的 effective playlist preview/calendar view。

## 4. Verification

- [ ] 4.1 補 boundary、overnight、repeat day、time-untrusted、shuffle/schedule tests。
- [ ] 4.2 跑 Images browser/offline playback critical journeys。
- [ ] 4.3 跑 root `pnpm test`、`pnpm build`、`pnpm verify`。
