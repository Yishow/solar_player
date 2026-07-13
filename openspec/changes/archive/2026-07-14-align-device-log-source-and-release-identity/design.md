## Context

systemd unit把 stdout/stderr送 journald，Device Status API卻掃 LOG_DIR/*.log；production通常沒有這些 files。Node service user直接讀 system journal的權限不應靠任意 sudo。另一方面 bundle沒有 release manifest，Device Status只顯示 Node/host資訊。

## Goals / Non-Goals

**Goals:**

- production Device Status讀取 solar-display unit的 bounded journal evidence。
- unavailable、empty與access denied有不同語意。
- 每個 bundle產生不可混淆的 release identity。
- UI顯示 log source與 release identity，health保持輕量。

**Non-Goals:**

- 不建立 file sink或任意 journal query API。
- 不授權 server讀取任意 units或執行任意 shell。
- 不改 management trust判定。
- 不把 deep diagnostics塞進 /health。

## Decisions

### Read only the solar-display journal through a fixed helper

新增 root-owned `deploy/read-solar-display-journal.sh`，只接受 mode recent/export與整數 limit；limit clamp到1..500，unit固定 solar-display，boot scope固定 current boot，輸出格式固定 JSON lines或 short-iso text。helper不接受 unit、path或額外 journalctl flags。

installer把 helper安裝到 /usr/local/sbin，並以 rendered sudoers drop-in只允許 kiosk user執行該 helper；用 visudo syntax check後才完成。server透過 sudo -n、spawn without shell呼叫固定 helper path。dev/test以 injected runner回傳 fixtures或 unavailable。

### Return explicit log availability and bounded export

GET /api/device/logs回傳 data物件：source、available、entries、retention、unavailableReason。entries每筆只有 timestamp、priority、message。GET /api/device/logs/export只接受 bounded limit並回 text/plain attachment。

helper missing、sudo denied、journal unavailable或 malformed output回503 safe envelope，包含 source journald與 bounded reason；不回host command、sudoers內容或 path。trusted management gate在任何 spawn之前執行。

### Generate one release manifest per bundle

新增 `scripts/generate-release-manifest.mjs`，讀 Git commit/dirty state、build time、`apps/server/package.json` version與 migrations filenames的最高 numeric version，輸出 versioned JSON到 bundle root `release-manifest.json`。root bundle builder與 direct deploy都在 build後產生/安裝同一格式。

server config預設從 project root讀 manifest；parse失敗不阻擋 startup，而是在 device status回 unavailable reason。

### Present log source and release identity in Device Status

Device Status loader改讀 log summary，不再把 directory/files當 truth。view model顯示 Journald、entry count/retention或 unavailable reason，並提供 bounded export action。Host summary加入 releaseId、short commit、builtAt、packageVersion、schemaVersion與 dirty警示。

## Implementation Contract

- Behavior：trusted operator能在 Device Status看到最近 solar-display journal與部署版本；untrusted caller在 helper spawn前被403。
- Interface：log summary JSON欄位固定；export為 text/plain attachment；release manifest含 schemaVersion、releaseId、commit、builtAt、packageVersion、sourceDirty。
- Failure modes：reader/permission/journal/manifest錯誤回 bounded unavailable，不回成功空 file list且不使 server unhealthy。
- Acceptance：service/route/web tests、sudo helper fixture tests、bundle manifest test、非 production Linux注入 error→Device Status read-back通過。
- In scope：fixed helper、least-privilege install、log APIs/UI、release manifest。
- Out of scope：file logging、arbitrary journal access、health deep checks、auth redesign。

## Risks / Trade-offs

- [sudoers錯誤造成 deploy風險] → temp render後先 visudo -cf，驗證失敗不安裝drop-in。
- [journal record含 secrets] → API固定 record count且只對 trusted management；message不再二次展開或執行。
- [dirty build identity] → sourceDirty=true並在UI警示，不把dirty tree標成clean release。
- [migration filename解析失敗] → generator nonzero阻擋bundle；runtime只處理 manifest missing/corrupt為 unavailable。

## Migration Plan

先以 injected runner完成 server/web tests，再在非 production Linux安裝 fixed helper/sudoers並注入一筆 app error。舊 LOG_DIR files不刪除；API切換後不再把它們當 production truth。
