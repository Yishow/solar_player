## Context

目前 `/api/playback/settings` 直接讀寫 `playback_settings LIMIT 1`；`/api/playback/pages` 與 rotation evaluator 直接讀寫 `display_page_registry.enabled/display_order/duration_seconds`。這些全域欄位同時扮演 catalog metadata 與播放配置，無法自然擴展成多個 Playback Profiles。

本 change 只建立正式 Default Playback Profile 與相容層，不提前實作多 Profile 管理、Draft/Publish 或 Device Group 指派。

## Goals / Non-Goals

**Goals:**

- 建立可供後續多 Profile API 重用的正式資料模型。
- 將既有資料依責任一次遷移至 Default Playback Profile 與全域 Playback Runtime Policy，保持所有既有 API response 與行為。
- 保證 production 寫入只落在 Profile tables，不同步維護 legacy playback state。
- 保持 display page instance 建立、更新與封存功能可用。

**Non-Goals:**

- 不新增多 Profile CRUD、版本、發布或回滾。
- 不刪除 legacy tables/columns；contract 階段才處理 schema cleanup。
- 不改變前端 Playback Settings 介面或 API response shape。

## Decisions

### Add the final profile model now

建立 `playback_profiles`、`playback_profile_settings` 與 `playback_profile_pages`。Default Profile 使用穩定 key，且資料庫只允許一個 default。這不是暫時 shadow table；既有 API 立即切換成讀寫這組正式 tables。

### Keep Transition and Freshness enforcement global

`transition_type`、`transition_speed` 與 `enforce_fresh_runtime_data` 屬於 Server 全域 Runtime Policy，不屬於 Playback Profile。建立 singleton `playback_runtime_policy` 保存這三個欄位；既有 Playback settings API 由 Default Profile Settings 與全域 Runtime Policy 組合既有 response，更新時在同一 transaction 拆分寫入兩個正式 source of truth。

### Migrate once, then stop dual-writing

Migration 保留已發布的 027 schema：027 先將 legacy settings 複製到 Default Profile Settings，028 再將其中的 transition type、transition speed 與 freshness enforcement 複製到全域 Runtime Policy。這確保已套用 027 且由 operator 更新過的值不會被較舊的 legacy row 回退。完成後 Profile Settings 中這三個舊欄位與其他 legacy 欄位都只作為 schema compatibility remnants；production services 不再讀寫它們。因 registry legacy playback columns 目前為 NOT NULL，新 page insert 可填安全 placeholder，但實際狀態只寫入 Profile Page。

### Keep registry identity separate from playback membership

`display_page_registry` 繼續擁有 page key、template、route、labels、archive metadata。Default Profile Page 擁有 enabled、display order 與 duration。頁面建立時在同一 transaction 建立 registry row 與 Default Profile membership；頁面封存時封存 registry metadata 並停用 Profile Page。

### Preserve the public compatibility façade

`/api/playback/settings`、`/api/playback/pages`、`/api/playback/rotation-plan` 與既有 update endpoints 維持 response shape、validation 與 socket events。未來 profile-specific APIs 必須呼叫相同 Profile service，並重用同一個全域 Runtime Policy seam，不另建 persistence path。

## Implementation Contract

**Behavior**

- 既有資料庫升級後 SHALL 有且只有一個 Default Playback Profile。
- legacy settings 的 Profile-owned 欄位與所有未封存 registry pages SHALL 在首次 migration 後以相同值出現在 Default Profile。
- fresh upgrade 的 legacy transition type、transition speed 與 freshness enforcement SHALL 經 027 Profile row 搬至全域 Playback Runtime Policy；若原始 027 已套用，SHALL 保留該 Profile row 中較新的 operator state。
- 既有 Playback APIs SHALL 只讀寫 Default Profile 與全域 Playback Runtime Policy，且 response shape、排序、validation、transition normalization 與 socket events 不變。
- display page instance create/update/archive SHALL 透過 Default Profile membership 反映 playback state。
- seed SHALL 為 fresh database 新增的 registry pages 建立 Default Profile membership，且 SHALL NOT 覆寫 operator-saved profile state。

**Interface / data shape**

- Profile identity SHALL 使用穩定 `profile_key`；Default Profile SHALL 有唯一 default marker。
- Profile Settings SHALL 保存 Autoplay、Loop、起始頁、排程、Idle、亮度與方向。
- 全域 Playback Runtime Policy SHALL 以 singleton row 保存 transition type、transition speed 與 freshness enforcement。
- Profile Pages SHALL 以 `(profile_id, page_id)` 唯一保存 enabled、display order 與 duration。
- Playback page response SHALL 由 registry metadata JOIN Profile Page state 組成。

**Failure modes**

- 找不到 Default Profile、其 settings row 或全域 Playback Runtime Policy SHALL 明確失敗，不得悄悄回讀 legacy tables。
- 新 display page 若無法在同一 transaction 建立 profile membership，registry row SHALL 不得殘留半成品。
- migration 重跑 SHALL 不建立第二個 Default Profile、不重複 page memberships，也不得覆寫已存在的 Profile 或全域 Runtime Policy state。

**Acceptance criteria**

- focused migration contract test 證明 legacy responsibility split、原始 027 升級保值、唯一 default 與重跑安全。
- public Playback API integration test 證明即使 legacy rows 被改成矛盾值，settings/pages/rotation 仍以 Default Profile 與全域 Runtime Policy 為準。
- existing server suite、build 與 `pnpm verify` 全部通過。

**Scope boundaries**

- legacy tables/columns 本次保留，不提供新的對外 legacy write API。
- 不建立 profile versioning、group assignment 或 per-device override。
