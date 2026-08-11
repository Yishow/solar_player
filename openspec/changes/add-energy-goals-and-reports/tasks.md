## 1. Report model and API

- [ ] 1.1 定義 daily/weekly/monthly period resolver、coverage/provenance與 shared report types。
- [ ] 1.2 實作 daily-summary based report aggregation與 current partial period handling。
- [ ] 1.3 實作 previous-period same-elapsed comparison與 insufficient-coverage semantics。
- [ ] 1.4 新增 report API與 CSV serializer/download，驗證 UI/CSV totals一致。

## 2. Energy goals

- [ ] 2.1 新增 goals schema/service/validation與 monthly generation/self-consumption/consumption presets。
- [ ] 2.2 實作 goal evaluation：progress、gap、met/on-track/behind/unavailable semantics。
- [ ] 2.3 新增 management goals/report UI與 Overview bounded goal summary。

## 3. Verification

- [ ] 3.1 補 month/week boundary、leap/month length、partial period、missing day、timezone tests。
- [ ] 3.2 補 CSV parity與 goal operator/unit tests。
- [ ] 3.3 跑 browser report/goal journey、root `pnpm test`、`pnpm build`、`pnpm verify`。
