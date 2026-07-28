## 1. 累積家庭等效對齊

- [x] 1.1 Reuse the sustainability factory-scope evaluation so Derive household-equivalent cards from measured self-consumption and Cumulative household equivalence follows the active factory generation scope return Chungli `total_mwh` in kWh with the same freshness and timestamp as the Sustainability headline; verify with fresh Chungli service tests in apps/server/src/services/householdEquivalenceService.test.ts.
- [x] 1.2 Treat stale factory summaries as unavailable household basis so stale, missing, invalid, and regression Chungli summaries do not fall back to `cumulative_counters.generation`; verify unavailable card provenance and unchanged today-card behavior in apps/server/src/services/householdEquivalenceService.test.ts.

## 2. 月用量曲線審查

- [x] 2.1 Audit the monthly curve before changing it by compare `/api/metrics/daily-summary?range=month`, `/api/metrics/history?range=month`, and EnergyTrend month view-model output for month-start boundary, chronological order, and unit consistency; verify with focused route/view-model tests and live API evidence.
- [x] 2.2 Add a minimal correction only if the audit reproduces a monthly curve defect; verify the exact defect with a focused regression test and preserve unaffected day, week, year, and total ranges.

## 3. 驗證

- [x] 3.1 Run `spectra analyze align-chungli-household-equivalent --json`, `spectra validate align-chungli-household-equivalent`, focused server and web tests, and the relevant package builds; verify the live Sustainability API reports the same Chungli source timestamp for the cumulative generation and household-equivalent cards.
