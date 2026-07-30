## Context

此前置為 versioned-playback-profile-governance、Device Group、identity liveness 與 safe playback boundary。Publish 已能建立 immutable version，但尚未指派與證明 Client 套用。

## Goals / Non-Goals

**Goals:**

- 將 Profile Version 指派成 Group desired state。
- Client 在安全邊界更新 applied state，失敗保留舊版本。
- 以 heartbeat 與管理彙總證明 50 台 rollout 狀態。

**Non-Goals:**

- 不做 canary、自動分批、強制 reload 或離線 App Shell cache。
- 不讓離線 Client 阻擋其他 Client。
- 不改寫 version history。

## Decisions

### Persist desired assignment per group and applied state per device

Publish transaction 更新目標 Group desiredVersionId；Device appliedVersionId、updateState、lastError 與 updatedAt 分開保存。Group desired 不覆寫 Device applied，才能觀察等待與失敗。

### Stage version snapshots before the safe boundary

Client 取得 desired snapshot 並完成 schema/asset reference validation後標記 waiting。當前頁仍在新 rotation 時完成本頁；失效時下一 transition tick切換。成功後 heartbeat 回 applied；失敗保留舊 snapshot並回 failed。

### Derive fleet summaries from device states

Management summary 以 desired/applied/liveness 計算 applied、waiting、offline、failed，不保存易漂移 aggregate counter。offline Device 保留 applied version與 last seen。

## Implementation Contract

**Behavior**

- Publish 後所有目標 Group 立即有新 desired version。
- 在線 Client 各自安全套用；一台失敗或離線不阻擋其他台。
- 失敗 Client 繼續播放上一 applied version，錯誤可觀察。
- reconnect Client 自動比較 desired/applied 並補套用。

**Interface / data shape**

- heartbeat 增加 desiredVersion、appliedVersion、updateState(waiting|applied|failed)。
- Client snapshot endpoint 只回其 Credential 對應 Group 的 desired version。
- fleet summary 回 counts 與 per-device state，不回 credential。

**Failure modes**

- desired snapshot 驗證失敗不改 applied version。
- heartbeat claimed version 與 Server assignment 不一致時記 failed/mismatch，不信任 Client 改 desired。
- Group 變更後以新 Group desired 取代待套用目標，仍遵守安全邊界。

**Acceptance criteria**

- tests 覆蓋 publish assignment、online apply、offline non-blocking、reconnect catch-up、failure preserve、Group move。
- 50-client harness 驗證 bounded fetch與無同步 reload storm。
- pnpm test/build/verify與五頁 fresh witness/evidence bundle 通過；使用者判定切換體驗。

**Scope boundaries**

- In scope：desired/applied persistence、snapshot fetch、Client staging、安全切換、heartbeat/UI summary。
- Out of scope：Profile authoring、canary、Service Worker、Freshness Policy。

## Risks / Trade-offs

- [版本與 App code 不相容] → snapshot schema version validation失敗即保留舊 applied。
- [大量 Client 同時 fetch] → HTTP cache/ETag與bounded reconnect jitter，禁止立即全頁 reload。
