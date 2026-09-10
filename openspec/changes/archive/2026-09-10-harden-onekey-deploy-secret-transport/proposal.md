## Problem

P1 修正：`scripts/raspi-onekey-deploy.sh` 目前把 `RDP_PASSWORD` 放進 `remote_args`，再以 `%q` 組入 SSH command string；`SUDO_PASSWORD` 則以 `printf | sudo -S` 組進同一個 remote command。shell quoting 只處理語法，不會讓 secret 從 local/remote subprocess argv、command capture、environment 或 logs 消失，且 target bootstrap 仍以 `--rdp-password` 明文呼叫 configurator。這使 one-key deploy 的 SSH/sudo/RDP 功能與 secret transport 邊界不一致。

## Root Cause

- 啟動階段的 `SCRIPT_DIR`/`dirname`、build、`date` 與後續 child 可能繼承 caller 的 exported `SSH_PASSWORD`、`SUDO_PASSWORD`、`RDP_PASSWORD`；目前 SSH password 另被 export 為 `SSHPASS`，並以 `sshpass -e` 傳遞。
- 現有 parser 先以 `SUDO_PASSWORD` env 或 `SSH_PASSWORD` fallback 初始化，再由 legacy `--sudo-password` 覆蓋；設計必須保留這個「explicit legacy CLI 優先於 env」語意，而不是把 env 寫成優先。現行 CLI 沒有 legacy `--ssh-password`。
- secret FD/pipe 若跨多次 ssh、rsync 或 firstboot/authentication 重用，會耗盡 offset；目前也沒有 versioned frame、target file validation、raw-byte bounds 或可觀測的中斷/遠端失聯 cleanup boundary。

## Proposed Solution

- 固定 source precedence：SSH 為 `--ssh-password-fd` > `SSH_PASSWORD` env（沒有 legacy `--ssh-password`）；sudo 為 `--sudo-password-fd` > legacy `--sudo-password` > `SUDO_PASSWORD` env > 已解析的 SSH secret fallback；RDP 為 `--rdp-password-fd` > legacy `--rdp-password` > `RDP_PASSWORD` env。sudo 只有在所有 sudo sources 都未指定時才 fallback 到已解析 SSH；invalid FD/frame 一律 fail closed，不回退。valid FD 的空欄位代表未提供，才可繼續下一個 source。
- 在任何 `dirname`、`pwd`、build、`date`、ssh、rsync 或其他 child 前 capture 非 dry-run 所需的 env/CLI source 到 private non-exported values，執行 `export -n` 並 `unset SSH_PASSWORD SUDO_PASSWORD RDP_PASSWORD SSHPASS`；全案禁止 `set -x` secret leakage。dry-run 先完成 shell-only scope gate，在讀 FD 或建立 secret material 前返回，不 build、不 date、不啟 child。
- 每次 SSH、rsync、firstboot 或其他 authenticated child 都建立新的 readable pipe/FD，傳完即 close；resolved raw FD source 只 read 一次，不重用耗盡 offset，也不把 secret 放在 argv、command、environment 或 logs。
- 定義 versioned non-eval stdin frame：固定 `SOLAR-DEPLOY-SECRET-FRAME/1\n`，欄位固定依序 sudo、RDP；每欄是 canonical decimal byte length 加 LF、原始 value bytes、單一 LF，最後 `END\n` 並立即 EOF。每欄 0..4096 bytes，value 禁止 NUL/CR/LF，空欄代表未提供；總 frame 上限 8236 bytes。parser 拒絕 malformed length、extra/truncation、overlong、額外 bytes 與 eval/base64/secret-bearing command。
- target receiver 先解析 frame，再將 RDP 寫入本次受控 mode-700 parent/mode-600 regular non-symlink file；sudo 密碼只以 builtin printf 寫到本次 sudo stdin。root 或 sudo 啟動 bootstrap 時只帶 `--rdp-password-file` 非秘密 path，bootstrap 驗證 metadata 後原樣交给 configurator，由 configurator 唯一讀取內容一次並 close。只有建立者依 owner/marker/type/containment 驗證清理 exact owned path；不任意刪 caller path。既有最終 persisted base64 RDP config 不在 transient transport 保證內。
- 保留 sudo/RDP 功能、special-character exact bytes、legacy direct flags 相容；legacy direct secret flag 發出不含 secret 的 migration warning，提供 numeric FD 安全替代並明示 parent invocation argv 風險。normal/catchable `EXIT`、`HUP`、`INT`、`TERM` 做 cleanup；SSH disconnect/remote loss 回報 cleanup unknown 與 exact-owned-path recovery，不能保證 SIGKILL 或斷電可 trap。
- 依序先 apply `fix-runtime-restore-drill-verification`，後 apply 本案；兩案共同 touch `scripts/deploy.test.mjs`，本案 apply 前回讀前案最新測試並只追加 fake-process/sentinel fixtures，不覆蓋 restore tests。

## Success Criteria

- secure path 的 raw secret，以及可逆的 shell-escaped、quoted、base64 或其他 encoded 副本，都不出現在 captured local/remote argv、command text、child environment、stdout、stderr 或 ordinary logs；測試使用 fake process sentinel，不宣稱已證實真實環境外洩。
- secure FD source precedence、empty-field semantics、invalid FD no-fallback、legacy `--sudo-password` precedence、SSH fallback、RDP mode、dry-run no-FD-read/no-material 與至少三次連續 SSH+rsync 的 fresh FD reuse 都有 focused fixtures。
- frame parser 以固定 version/magic、decimal lengths、4096-byte 欄位上限、8236-byte total 上限、禁止 NUL/CR/LF、exact special-byte round-trip、truncation/extra rejection 被驗證；無 secret-bearing command 或 base64 argv。
- target `--rdp-password-file` 通過 mode/owner/regular-nonsymlink/read-once/exact-owned-cleanup 驗證；RDP passwordless/system-password 與 sudo 功能維持，既有 persisted base64 RDP config policy 不被宣稱已修正。
- normal/failure/catchable signal 有 cleanup 證據；remote disconnect、SIGKILL、power loss 的清理標記為 unknown/未保證並提供 exact-owned-path recovery，不把所有 interrupt 宣稱已清除。
- `scripts/deploy.test.mjs` 保留 restore change 的正向/負向 tests，再追加本案 sentinel tests；proposal 階段不執行 runtime tests、real SSH、real credentials/host、production 或 field acceptance。
- 不外洩的保證限本案控制的 transport/diagnostics；不聲稱能保護 caller 啟動前已暴露的 argv/environment、hostile child diagnostics、root/process-memory inspection 或既有 persisted RDP config。fixture captures 用來驗證受控 transport，不是任意第三方程式的安全證明。

## Capabilities

### New Capabilities

- （無）

### Modified Capabilities

- raspi-onekey-kiosk-deployment：限制 one-key deploy 的 SSH/sudo/RDP secret transport，固定來源優先序、versioned frame、target file contract、redaction 與 cleanup observability。

## Impact

- Affected specs: `openspec/specs/raspi-onekey-kiosk-deployment/spec.md`（以本 change 的 delta spec 修改 `Provide a local Raspberry Pi kiosk deployment entrypoint` requirement）。
- Affected code for later apply:
  - Modified: scripts/raspi-onekey-deploy.sh
  - Modified: deploy/raspi-bootstrap.sh
  - Modified: deploy/configure-lightweight-desktop.sh
  - Modified: scripts/deploy.test.mjs
- Affected workflow: 必須先完成 `fix-runtime-restore-drill-verification`；本案 apply 前回讀 shared `scripts/deploy.test.mjs` 最新版本，保留 restore tests，僅 append secrets tests。
- Excluded scope: app code、其他 changes、memories、.spectra.yaml、pi5-deployment skill、production hosts、real credentials、production logs、field state，以及所有未列出的 deploy/scripts files；本案不改 restore implementation。本 propose 不改 main specs；後續正式 closeout 的 spec sync 依 workflow。
