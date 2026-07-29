# Default Playback Profile 與 Playback API 相容層

## 目的

Solar Player 的播放設定已由全域 singleton 演進為正式 Playback Profile 模型。第一階段只有一個 `Default Playback Profile`，但資料結構與 service seam 已可供後續多 Profile、Device Group 指派與版本發布重用。

## 資料責任

- `playback_profiles`：Profile identity、穩定 `profile_key` 與 default marker。
- `playback_profile_settings`：Autoplay、Loop、起始頁、排程、Idle、亮度與方向。
- `playback_profile_pages`：Profile 與 display page 的 membership、啟用狀態、順序與停留時間。
- `playback_runtime_policy`：全域 Transition type、Transition speed 與 Freshness enforcement；固定 singleton `id = 1`。
- `display_page_registry`：page identity、template、route、labels 與 archive metadata。

`display_page_registry` 內既有的 `enabled`、`display_order`、`duration_seconds` 欄位暫時保留，因為直接重建 SQLite table 會擴大 migration 風險。它們是 **legacy schema remnants**，不再是 production playback source of truth。新 page insert 只為滿足舊 NOT NULL schema 填入安全 placeholder；實際 playback state 只寫入 `playback_profile_pages`。

## Compatibility façade

下列既有 API 對外契約不變；內部將 Profile-owned 欄位讀寫 Default Profile，Transition 與 Freshness enforcement 讀寫全域 Runtime Policy：

- `GET/PUT /api/playback/settings`
- `GET/PUT /api/playback/pages`
- `GET/PUT /api/playback/rotation-plan`
- Display rotation preview 與依賴 `readPlaybackPages()` 的 story/readiness services

未來 profile-specific API 必須呼叫同一個 Playback Profile service，並重用同一個全域 Runtime Policy seam，不得建立第二條 persistence path。`PUT /api/playback/settings` 以同一個 SQLite transaction 拆分寫入兩者，因此不會留下只更新一半的狀態。

## 遷移行為

Migration 會：

1. 建立正式 Profile tables 與 singleton 全域 Runtime Policy table。
2. 建立唯一的 `profile_key = default`、`is_default = 1` Profile。
3. 027 若 Default Settings 尚不存在，從 legacy `playback_settings` 複製一次完整的舊 settings row；此已發布 schema 不改寫。
4. 028 若全域 Runtime Policy 尚不存在，從 Default Settings 複製一次 Transition 與 Freshness enforcement。這會保留已套用 027 後由 operator 更新、但未再 dual-write 到 legacy row 的值。
5. 若 Default Profile Page membership 尚不存在，從未封存 registry rows 複製一次。

Migration 可重跑：既有 Profile、Settings、Runtime Policy 與 Page state 不會被覆寫。027 Settings 中的 Transition／Freshness 欄位暫留為 migration compatibility remnants，production service 不再讀寫。Fresh database 在 migrations 後才 seed registry pages，因此 seed 只會以 `INSERT ... DO NOTHING` 將未封存的新頁面附加到 Default Profile，並保留 operator 已儲存或 archived 的狀態。

## 移除相容層的條件

只有在以下條件全部成立後，才能提出 contract migration 刪除 legacy tables/columns：

1. 所有 server/web callers 已改用 profile-aware API。
2. 沒有 production service 讀寫 legacy playback state，且所有 Transition／Freshness callers 都使用全域 Runtime Policy。
3. 部署中所有 SQLite databases 都已通過 Default Profile migration。
4. 備份、rollback 與離線升級流程已驗證不需要舊欄位。
5. Contract migration 有獨立 spec、資料備份策略與 downgrade 說明。

在此之前，不應加入 trigger、雙寫或 background reconciliation；這些做法會重新製造兩套 source of truth。
