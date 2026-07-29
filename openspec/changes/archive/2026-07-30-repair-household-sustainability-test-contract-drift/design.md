## Context

`pnpm test` 與 `pnpm verify` 目前固定在 server suite 出現 13 個失敗。相同失敗已在 change 前的 `a8efa55` 隔離 snapshot 重現，因此不是 Default Playback Profile work 引入。程式、migration 026 與 operator runbook 已採用台灣場域預設值，但 archived spec 與跨 household／Sustainability／Card Data 測試仍混用舊係數、舊 global cumulative provenance 與不完整 factory summary fixture。

這個 change 是解除 repo verification gate 的獨立 bug fix。它跨四個 test surfaces 與一份 canonical spec，但不改 API、資料模型或播放頁視覺。

## Goals / Non-Goals

**Goals:**

- 讓計算設定 spec 與 migration、service、runbook 的正式預設一致。
- 讓 13 個失敗案例各自建立足夠且明確的 coefficient、factory scope、factory summary、runtime metric fixture。
- 保留既有 active factory scope、provenance、fail-closed 與 Card Data diagnostics 行為。
- 恢復完整 server/web suite 與 `pnpm verify` gate。

**Non-Goals:**

- 不變更 household 或 Sustainability 公式。
- 不重新設計 factory aggregate fallback。
- 不變更 API response shape、SQLite schema、MQTT topic、Playback Profile 或前端。
- 不把測試改成只斷言當前輸出而失去 provenance／failure-mode 契約。

## Decisions

### Treat shipped Taiwan defaults as canonical

以 migration 026、`calculationSettingsService` 與現場 runbook 已一致使用的 0.467／0.16／13／400／4.5 為正式 recommended defaults，更新 delta spec。替代方案是回滾產品值以符合舊 spec；這會撤銷已交付的場域決策且影響真實顯示，因此拒絕。

### Repair fixtures before changing runtime

每個失敗先分類為 coefficient drift、factory scope/summary fixture 缺失、或 diagnostics expectation drift。測試若要驗固定公式輸出，必須在 arrange 階段明確寫入使用的 calculation settings；若要驗 active factory aggregate，必須明確設定 Default Profile factory pages 與完整 summary。只有新的 focused test 證明 runtime 違反既有 spec 時才允許最小 source fix。

### Keep provenance assertions semantic and explicit

不只更新數字。Household/Sustainability 測試仍須斷言 derived status、source、source class、timestamp 或 supporting label；Card Data 測試須區分 topic 不存在與公式輸入缺失。這可防止用批次 literal replacement 讓 gate 變綠卻掩蓋資料來源回歸。

## Implementation Contract

**Behavior**

- 缺少 persisted calculation settings 時，server SHALL 使用 0.467 kgCO2e/kWh、0.16 trees/ton、13 kWh/day、400 kWh/month、4.5 NTD/kWh 與 `co2AutoConvertSmallToKg=false`。
- Persisted non-default settings SHALL 繼續優先於 recommended defaults。
- Household cumulative card SHALL 依 active factory playback scope 與其 fresh summary 產生值及 provenance；測試不得再期待未被 runtime 使用的 global cumulative source。
- Household today card、Sustainability big numbers 與 Card Data diagnostics SHALL 以測試明確建立的 coefficients/runtime inputs 計算或 fail closed。
- Card Data 在 topic 已存在但公式依賴缺失時 SHALL 回報 formula-input-missing；只有必要 topic 本身缺少時才回報 missing-topic。

**Interface / data shape**

- 現有 HTTP response、shared types、SQLite schema、MQTT topics 與 public function signatures不變。
- 允許新增 test helper，但 helper 必須接收明確的 coefficients、factory scope 或 summary values，不得依賴測試執行順序。

**Failure modes**

- Factory summary 缺值、stale 或 scope 為 none 時，fixture 對應案例 SHALL 驗證既有 unavailable/fail-closed 結果，不可用 global counter 靜默補值。
- 測試若因不完整 arrange 得到不同來源，應修正 fixture；不得直接把 expected provenance 改成偶然值。
- 若 focused test 證明 runtime 與現有 spec 衝突，apply SHALL 暫停並回報需要修改的 capability，而非擴張 source behavior。

**Acceptance criteria**

- 原 13 個案例全部通過，且 focused command 明確包含四個失敗檔。
- `sustainability-calculation-settings` delta spec 通過 Spectra analyze/validate。
- 完整 `pnpm test`、`pnpm build`、`pnpm verify` 通過；server runner 的現行直接測試條款仍遵守。
- Diff 不包含 Playback Profile schema/API、前端或 MQTT 行為變更。

**Scope boundaries**

- In scope：一份 calculation settings delta spec、四個既有 test files、必要的共用 test helper；只有 spec violation 證據成立時才包含最小 server source fix。
- Out of scope：產品係數再決策、factory aggregate redesign、UI/FHD、部署、資料 migration、API 或 topic 變更。

## Risks / Trade-offs

- [Risk] 直接更新 expected literals 可能讓測試失去資料來源辨識力 → 每個修復保留 provenance/status assertion，並以 fixture 明確輸入。
- [Risk] 共用 seed data 讓測試意外走 factory aggregate → 每個需要其他路徑的案例明確清除或建立相關 runtime rows。
- [Risk] 修復 baseline tests 混入 Default Profile change → 本 change 獨立追蹤，完成後才返回原 change。
