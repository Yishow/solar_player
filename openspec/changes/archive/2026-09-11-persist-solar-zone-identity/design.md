## Context

Scraper 目前的 `stableZoneID` 只保證同一 Scraper instance 內穩定。canonical MQTT 與本地 history 卻把 numeric zone id 當長期身份，因此 process lifecycle 不應決定這個數字。SQLite `zone` history 有 serial 與 zone_id，可幫助首次升級，但規格允許 `sqlite_enabled=false`，所以 durability 不能只靠 DB。

## Goals / Non-Goals

**Goals:**

- non-empty serial 在 restart、API reorder、暫時消失／重現後維持 numeric alias。
- 新 ID 在 publish / record 前先 durable。
- 首次升級盡量沿用最近 history mapping，同時不重用任何歷史 ID。
- state 壞掉時明確失敗，不 silent remap。

**Non-Goals:**

- 不把 MQTT topic 改成 serial 字串，不改 server canonical key。
- 不保證 serial-less zone 永久 identity；不用 name/capacity 猜。
- 不要求 SQLite enabled。
- 不修復已存在的 server 歷史錯綁。
- 不支援同一部署目錄多個正式 collector process 同時寫 sidecar；維運要求維持單一 runtime owner。

## Decisions

### 1. Canonical identity layer 放在 scraper fetch 後

保留 scraper 原本 process-local ID 作 parser/preview 行為；正式 service 在 `Fetch()` 成功後、`publishData`、`storage.Record`、anomaly 與 discovery 前，使用 `zoneidentity.Store.ResolveZones` 覆寫 canonical `ZoneID`。這讓 HTTP parser 不需要知道部署 state path，同時確保所有 data-plane downstream 看到的是 durable alias。

`once` 會寫本地 history，因此同樣在 `Record` 前做 durable resolution。`dump-api` / WebUI 的純診斷 fetch 不會寫 canonical data，維持 parser-local preview ID。

### 2. Sidecar 是 authority，SQLite 只做首次 bootstrap

sidecar 名稱為 `solar_zone_identities.json`，路徑由 `config.ConfigPath()` 的目錄決定。state 使用 versioned JSON，per-factory 保存 identity key、numeric zone id、`next_zone_id`。

Open 成功且 factory 已存在於 sidecar 後，該 factory 直接視為 authoritative，**不再查 history**。這避免 sidecar 已正確但歷史 DB 有舊衝突時反而無法啟動。

### 3. Batch allocation 先 durable 再回傳

`ResolveZones` 在單一 lock 下建立整批候選 mapping。新 serial 或 position fallback 使用 monotonic `next_zone_id`，ID 不回收。只要有新 mapping，就把完整 state 寫到 temp file、restricted chmod、flush/close、rename；成功後才回傳 resolved zones。任何 persistence error 都 rollback 該 factory 的 in-memory allocation並回 error。

因此 service 不會拿到「只存在 RAM、尚未寫成功」的新 zone id。

### 4. History bootstrap 使用最新單一 snapshot + historical floor

`storage.LatestZoneIdentitySnapshot(factory)` 讀最新 `ts` 下 non-empty serial/zone_id，要求一對一；另外讀該 factory 歷史最大 `zone_id`，以 `max+1` 當 `nextFloor`。最新 snapshot 沒出現的舊 zone 不會被猜回原 ID，但它曾使用過的數字也不會配給別的 serial。

若 latest snapshot duplicate serial / invalid id，且沒有 authoritative sidecar，bootstrap fail explicit；不做跨時間 majority，也不按 name/capacity 猜。

### 5. Serial-less 只做 position fallback

空 serial 使用 `position:N` key 作 best-effort fallback並每輪 warning。key namespace 與 `serial:` 分離，避免真實 serial 與 position key collision。這個 fallback 可保存相同 position 的 ID，但 API reorder 仍可能讓不同硬體換位置，因此規格明確不提供 durable hardware identity 保證。

## Implementation Contract

- State key：factory scope + `serial:<trimmed serial>`；case 原樣保留。
- Position fallback：`position:<positive N>`，只屬 best-effort。
- Sidecar authority：已持久化 factory state > history bootstrap > first-fetch allocation。
- ID reuse：同 factory 的已配置 ID 永不改綁其他 identity key。
- Durability：新 mapping persist 成功後才可回傳給 canonical data-plane。
- Failure：existing sidecar malformed/version mismatch/collision 或 write failure皆回 error，不 reset。
- Bootstrap helper唯讀既有 SQLite schema，不新增 migration。
- MQTT `zone/{numericId}` 與 payload shape 不變。

## Risks / Trade-offs

- **首次沒有 sidecar也沒有 history**：無法推回舊版本曾用 mapping；第一次新版本觀察會建立 authority。這是一次性 continuity 限制。
- **歷史 snapshot 已錯綁**：只採最近單一 coherent snapshot，不跨時間猜；若同 timestamp 已衝突則拒絕 bootstrap。
- **sidecar 成為新部署 state**：runbook 明確要求跟 config 一起備份/還原。
- **serial-less 仍可能因 reorder 錯接**：持續 warning，不宣稱本 change 已修完這類硬體。
- **新 serial 時 I/O failure 會犧牲該輪 availability**：選資料身份正確性優先，不先發布再補寫。
- **多 process 同寫同 sidecar 未納入本 change**：部署需維持單一正式 collector owner；若未來要支援 active-active collector，需另加跨 process locking/coordination。
