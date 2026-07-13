## Why

2026-07-13 的 production audit 顯示 Socket.IO／Engine.IO、MQTT 與 React Router 的 transitive resolution 仍有 2 high、1 moderate、1 low advisories；direct dependencies 已是目前宣告範圍內的最新版，因此必須從實際 lock resolution 修復，而不能把 outdated 綠燈當成安全證據。

## What Changes

- 以最小 lockfile refresh 或 scoped override 將 ws 與 react-router 解析到已修補版本。
- 新增可重跑的驗收契約：production audit 無 known vulnerabilities，且 dependency graph 不再解析到受影響版本。
- 對 MQTT、Socket.IO reconnect、router loader 與全量 build/test 做 targeted regression verification。

## Non-Goals

- 不升級與 advisory 無關的 major versions。
- 不在此 change 重寫 manifest 的 latest 版本政策。
- 不順便重排或格式化無關 lockfile 區段。

## Capabilities

### New Capabilities

- `production-dependency-advisory-remediation`: 定義 production dependency 漏洞清零、解析版本證據與回歸驗證契約。

### Modified Capabilities

（無）

## Impact

- Affected specs: `production-dependency-advisory-remediation`
- Affected code:
  - Modified: `package.json`, `apps/server/package.json`, `apps/web/package.json`, `pnpm-lock.yaml`
  - New: none
  - Removed: none
