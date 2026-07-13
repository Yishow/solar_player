## Context

目前 production audit 的 vulnerable paths 來自 lockfile 解析出的 transitive ws 與 react-router；direct package manifests 使用的版本範圍沒有透過 outdated 顯示可更新項。這個 change 的風險不是 API 設計，而是 lockfile churn、override 範圍過大，或只把 audit 壓下去卻破壞 MQTT／Socket／router runtime。

## Goals / Non-Goals

**Goals:**

- 讓 committed production dependency graph 的 audit 為零 advisory。
- 保留可解釋的 dependency graph evidence。
- 用 targeted runtime tests 與 repository build/test 證明修復沒有功能回歸。

**Non-Goals:**

- 不升級無關 major。
- 不重寫 latest manifest policy。
- 不改 application code 來迴避 dependency behavior。

## Decisions

### Targeted lock refresh before scoped overrides

先對 advisory 命中的 package family 做 targeted lock resolution refresh，並檢查 parent ranges 是否已允許 patched version。只有 parent range無法產生安全 resolution 時，才在 root `package.json` 加最窄的 scoped override；override 必須附上對應 parent path 與移除條件。

替代方案是全 workspace upgrade 或重建 lockfile。兩者會產生大量無關 churn，無法把回歸歸因到 advisory remediation，因此排除。

### Advisory evidence and regression gates

驗收先跑 production audit，再用 recursive dependency reason 輸出確認 ws 與 react-router 的每條 production path。之後依序跑 MQTT、Socket.IO、router targeted tests、完整 tests 與 production build。任何 audit finding、舊 vulnerable resolution、test failure 或 build failure都阻擋完成。

不以 pnpm outdated 或 direct manifest 顯示最新版作為安全證據。

## Implementation Contract

- Behavior：安裝 committed lockfile 時不再解析到 audit 命中的 vulnerable ranges；runtime MQTT、Socket.IO 與 routing 行為不變。
- Interface：production audit 回傳零 advisory；dependency reason 輸出只包含 patched ws／react-router resolutions。
- Failure modes：targeted refresh 若仍有 finding，apply 必須先判定是 parent range限制還是新 advisory，再決定 scoped override；不得忽略或降級 audit severity。
- Acceptance：production audit、dependency reason、targeted tests、完整 tests、production build 全部 exit zero。
- In scope：root/workspace manifests 中 advisory 必需的最小版本或 override、`pnpm-lock.yaml`。
- Out of scope：全套 dependency upgrade、manifest version policy、應用架構重構。

## Risks / Trade-offs

- [Audit database 在 apply 時已更新] → 以 apply 當天 fresh audit 為準，tasks 記錄實際 advisory IDs 與 patched resolutions。
- [Scoped override 影響多個 parent] → 先檢查 recursive dependency graph，只有相容 ranges 才共用 override。
- [Lockfile 出現無關 churn] → diff 審查只保留能追溯至命中 package family 的變動。

## Migration Plan

此 change 只改 dependency metadata；回滾方式為回復本 change 的 manifest／lockfile diff。部署前仍須完成同一 commit 的 build/test。
