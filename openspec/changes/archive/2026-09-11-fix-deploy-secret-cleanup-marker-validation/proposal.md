## Problem

P2 修正：secret receiver 的完整 ownership/marker 驗證失敗時，receiver_cleanup fallback 仍刪除 secret file 與 marker，再回報 cleanup: ok。已用本機 bootstrap 替身將 marker 改為無效內容及 mode 644 重現：exit 0，parent 被刪除。這違反既有「驗證 owner、marker、type、containment 後才移除」契約；未宣稱可跨 UID 攻擊。

## Root Cause

receiver_cleanup 的 parent-shape fallback 只重新驗證 payload 的 path/type/mode/owner，以及 marker 的 exact path、regular 與 non-symlink，略過 marker mode、owner、magic、owner/file binding。既有 partial marker validation failure fixture 反而要求刪除所有 transient material，未檢查驗證失敗應 fail closed。

## Proposed Solution

- 完整驗證失敗後保留該 invocation 的所有可疑 transient paths，回報 cleanup: unknown；不得以較弱的 fallback 刪除 marker、payload 或 parent。
- 分辨「本 invocation 確實建立的 parent」與僅計算出 candidate path／mkdir 失敗的情況，避免清理未建立的既有目錄。
- 部分初始化未取得可驗證 marker 時也保留材料並回報 unknown；正常完整 validated cleanup 仍移除本次精確路徑，關閉 descriptors，且不影響 sudo/RDP 原有傳輸。
- 擴充無真實 sudo/SSH 的 receiver fixtures，驗證 invalid marker、partial setup、正常 cleanup、signal 與 local handoff 的成功／失敗輸出。

## Success Criteria

- marker 內容、mode、owner、binding、type 或可讀性驗證失敗時，不刪除 marker、payload、parent；cleanup 為 unknown，原 bootstrap 成功時整體也非零退出。
- 正常 validated paths 仍確實移除、回報 ok；caller-owned、pre-existing、symlink 或 containment 不符的路徑維持 byte-for-byte 不變。
- partial setup failure 保留可疑材料；FD cleanup 照常進行，只輸出非秘密的 exact-owned recovery path，任何恢復刪除仍要求重新驗證。
- scripts/deploy.test.mjs、shell syntax、兩軸 review、安全 audit 與 pnpm verify 通過；不操作現場 Pi 或真實秘密。

## Capabilities

### New Capabilities

- （無）

### Modified Capabilities

- raspi-onekey-kiosk-deployment：補齊 marker 驗證失敗與部分初始化時的 fail-closed cleanup、ownership 與回報規則。

## Impact

- Affected specs：raspi-onekey-kiosk-deployment。
- Affected code：
  - Modified：scripts/raspi-onekey-deploy.sh
  - Modified：scripts/deploy.test.mjs
  - New：（無）
  - Removed：（無）
- 不改 frame、secret input precedence、SSH/sudo/RDP 政策、正式持久化設定或 restore drill；不引入通用清理框架。
