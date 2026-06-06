## 1. Solar Connector Thinning (TDD)

- [x] 1.1 更新 Solar `configRender.test.ts` 的 connector strokeWidth 斷言為新值（solarToInverter 6、inverterToFactory 6、inverterToCo2 4），先 RED；完成後以 `pnpm --filter @solar-display/web test -- src/pages/Solar/configRender.test.ts` 驗證。
- [x] 1.2 於 `apps/web/src/pages/Solar/displayPageConfig.ts` 把 connectorTreatments strokeWidth 改為 6/6/4（保留 main>co2），使測試 GREEN。

## 2. Factory Unified Color + Comb Fan-out (TDD)

- [x] 2.1 更新 Factory `configRender.test.ts`/`svgRouting.test.ts` 的 strokeColor 斷言為 `#527d3b`，先 RED；完成後以 focused test 驗證。
- [x] 2.2 於 `apps/web/src/pages/FactoryCircuit/displayPageConfig.ts` 把 connectorTreatments strokeColor 改為 `#527d3b`。
- [x] 2.3 於 `apps/web/src/pages/FactoryCircuit/index.tsx` 把負載 fan-out 由單點 bezier 改為結構化 comb（busX = 負載 left − 30 的垂直 bus + 短分支），path 由 resolved node/loadRow 幾何推導；power connectors 維持直線。

## 3. Gates + Witness

- [x] 3.1 跑 `pnpm --filter @solar-display/web test`、`pnpm run build` 全綠。
- [x] 3.2 `pnpm dev` + `pnpm run fhd:witness` 重截 `/solar`、`/factory-circuit`，與 reference 02/03 對照，確認走線細緻一致；觀察記入 closeout。
- [x] 3.3 Spectra gates：`spectra analyze` 無 Critical、`spectra validate --strict` 通過。
