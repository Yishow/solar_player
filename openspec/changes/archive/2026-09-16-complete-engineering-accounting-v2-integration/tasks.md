## 1. Versioned profile boundary

- [x] 1.1 實作「Repository 依版本回傳 profile union 且不強制轉型」：共用契約以 `schemaVersion` 區分 `SiteEnergyProfileV1 | SiteEnergyProfileV2`，V2 驗證 provider、member 與重疊關係，未知版本回傳 `PROFILE_VERSION_UNSUPPORTED`；以共用驗證測試證明混合 provider、重複 identity、無效 reference 與既有 V1 fixtures。
- [x] 1.2 [after: 1.1] 讓 `siteEnergyProfileRepository` 使用既有 `schema_version` 與 JSON 欄位完整往返 V1/V2，且重啟後保留 providerKind、members、revision、effectiveFrom；以 migration 建立的 repository 測試證明 V1 位元組相容、V2 讀回與未知版本失敗。

## 2. Provider evidence and accounting result

- [x] 2.1 [after: 1.1] 實作「Provider evidence 使用可辨識 snapshot 與確定性 fingerprint」：physical snapshot 維持現狀，engineering snapshot 綁定 sourceRef、engineeringId、mode、authority revisions 與 publisher，期間 fingerprint 綁定排序後的 effective report heads；以 snapshot 測試證明查詢順序不影響結果，registration 版本變更、correction 與 withdrawal 都會改變 fingerprint。
- [x] 2.2 [after: 1.1] 實作「單一會計結果契約包裝各 provider 證據」：新增 typed `AccountingPeriodResult` 與 physical/engineering adapters，engineering 直接加總可用 interval reports並輸出 coverage、缺少 identities、quality、issues 與 fingerprint；以 provider 測試證明兩日加總、零值、部分覆蓋、缺值、修正版取代、撤回降級及不得建立 meter rows。

## 3. Preview and apply transaction

- [x] 3.1 [after: 1.2, 2.1, 2.2] 擴充 profile preview，使 KN V2 engineering draft 驗證引用的 registrations、非重疊 membership 與請求期間，token 保存 canonical draft、provider snapshot 及期間 fingerprint，且 preview 不產生 domain writes；以 `siteEnergyProfileService` 測試驗證成功資料形狀、422 domain errors、service 不依賴授權層及 V1 calculator 結果不變。
- [x] 3.2 [after: 3.1] 實作「V2 preview 與 apply 共用既有 optimistic transaction boundary」：apply 在同一 immediate transaction 檢查 receipt、token、預期 revision、provider snapshot 及 fingerprint，再保存 V2 active revision；以 service 測試證明成功套用、重啟讀回、idempotent retry、409 stale registration/report/profile conflict 與所有失敗都不寫入 profile/receipt。

## 4. Provider-aware runtime consumers

- [x] 4.1 [after: 3.2] 讓 readiness 依 active profile provider 分流，V2 只有 reviewed membership 與請求期間的 expected identities 完整時為 ready，缺值保持 partial/unavailable 且不補零；以 readiness 測試證明 correction、withdrawal、缺少 identity、零值基準與 CL V1 無回歸。
- [x] 4.2 [after: 3.2] 實作「既有 projection storage key 納入 provider evidence」：day/month/year projection 的 result/context key 納入 providerKind、profile revision、period boundaries 及 revision fingerprint，避免命中 physical 或舊 engineering projection；以 projection 測試證明快取重用、correction invalidation、回復 V1 時隔離及舊結果保持 immutable。
- [x] 4.3 [after: 4.1, 4.2] 實作「Provider-aware consumers 分批接入，其餘入口明確失敗」：management history 與 profile routes 回傳 typed V2 period/readiness，其餘 V1-only consumer 明確回傳 `PROFILE_VERSION_UNSUPPORTED` safe envelope，禁止 legacy counter 或 raw meter fallback；以 route 與 consumer contract 測試證明 authorization、response shape、scope isolation 及沒有 silent downgrade。

## 5. 整合驗證與交付

- [x] 5.1 [after: 4.3] 完成 KN V2 preview → apply → 重啟讀回 → history/readiness 整合旅程，同時比對 CL V1 stored rows、history 與計算結果不變；以 server integration tests 固定完整流程、rollback 及跨 site 隔離。
- [x] 5.2 [after: 5.1] 由主代理回讀最終 source/diff，確認沒有 fake meter identity、period kWh 寫入 power destination 或未授權範圍；最終以 focused tests、`pnpm verify`、`git diff --check` 與 Spectra verify/review 結果建立 checkpoint。
