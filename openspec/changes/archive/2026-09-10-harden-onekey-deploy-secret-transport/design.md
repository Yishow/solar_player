## Context

本案修改既有 `raspi-onekey-kiosk-deployment` 的 local entrypoint secret transport。現行 `scripts/raspi-onekey-deploy.sh` 將 `SSH_PASSWORD` export 為 `SSHPASS` 後供 `sshpass -e` 使用；`RDP_PASSWORD` 先放入 `remote_args`，再以 shell quoting 組成 SSH command string；`SUDO_PASSWORD` 以 `printf` 與 `sudo -S` 一起放入 remote command。target-side `deploy/raspi-bootstrap.sh` 又以 `--rdp-password` 呼叫 `deploy/configure-lightweight-desktop.sh`。`%q` 可避免 shell syntax break，但不會使 secret 脫離 process argv、command capture、environment 或 logs。

authority 是 `openspec/specs/raspi-onekey-kiosk-deployment/spec.md` 的 `Provide a local Raspberry Pi kiosk deployment entrypoint` requirement；pi5-deployment skill 只作背景參考，本案不得修改。後續 apply 只限 `scripts/raspi-onekey-deploy.sh`、`deploy/raspi-bootstrap.sh`、`deploy/configure-lightweight-desktop.sh` 與 `scripts/deploy.test.mjs` 的必要區段。兩案都 touch `scripts/deploy.test.mjs`，本案必須在 restore change apply 後回讀其最新版本並追加測試。

## Goals / Non-Goals

**Goals:**

- 在本案控制的 transport 與 diagnostics 中，讓 raw secret 與可逆的 shell-escaped、quoted、base64 或其他 encoded 副本不進 local/remote child argv、SSH command string、remote bootstrap option list、child environment、stdout、stderr 或 ordinary logs；parent 自行以 legacy direct flag 啟動時的既有 argv exposure 另行明示。
- 以 dedicated FD、bounded stdin framing 與 target-side mode-600 channel 傳遞 SSH、sudo、RDP secrets；每個 authenticated child 都取得 fresh readable FD，並清理可辨識的 transient material。
- 保留 SSH_PASSWORD 的 operation-time input、SUDO_PASSWORD precedence 與 SSH_PASSWORD fallback、RDP passwordless/system-password、特殊字元 exact bytes、SSH target、sudo authentication、shell-safe non-secret quoting 與既有 cleanup/部署順序。
- 明確支援 `--ssh-password-fd`、`--sudo-password-fd`、`--rdp-password-fd`，並定義 legacy `--rdp-password`、`--sudo-password` 的 compatibility warning 與安全替代；目前沒有 legacy `--ssh-password`。
- 定義 `SOLAR-DEPLOY-SECRET-FRAME/1` 的 exact parser、byte limits、target `--rdp-password-file` validation、cleanup unknown boundary 與 fake-process evidence。

**Non-Goals:**

- 不將 secret 單純搬到 environment 後宣稱安全；SSH 不再透過 `SSHPASS`，RDP/SUDO 不只依賴 target environment。
- 不修改 RDP authentication policy、sudoers、SSH server policy、desktop setup 功能、hotspot、disk、service 或 deployment scope。
- 不修改 `.agents/skills/pi5-deployment/SKILL.md`、其他 changes、memories、real hosts 或 credentials。本 propose 不修改 main specs；未來正式 closeout 的 spec sync 依 workflow。
- 不改既有 `configure-lightweight-desktop.sh` 將 RDP credential 寫入 base64 config 的 persisted storage policy；本 change 只處理 transient transport。
- 不保證 caller 啟動前已暴露的 argv/environment、惡意 child 自行輸出的 diagnostics、root/process-memory inspection 或 persisted RDP config；no-leak assertions 限本案控制的 transport、arguments、環境與輸出。

## Decisions

### Decision: Operation-time secret source and compatibility boundary

source precedence 固定如下：

- SSH：`--ssh-password-fd` > `SSH_PASSWORD` env；沒有 legacy `--ssh-password`。
- sudo：`--sudo-password-fd` > legacy `--sudo-password` > `SUDO_PASSWORD` env > 已解析的 SSH secret fallback。只有前三個 sudo source 都未指定時，才使用已解析 SSH；RDP source 不參與 sudo fallback。
- RDP：`--rdp-password-fd` > legacy `--rdp-password` > `RDP_PASSWORD` env；RDP 不使用 SSH fallback。

每個 password FD 先驗證 descriptor 為可讀，再只 read 一次最多 4096 bytes 的 raw value；FD source 的空值代表未提供，才繼續下一層 source。無效/關閉/不可讀 FD、NUL、CR/LF、overlong 或截斷一律 fail closed，不回退到其他 source。legacy CLI flag 即使 value 為空仍視為 explicit CLI source，保留現有 `--sudo-password` 覆蓋 env 的語意；required password 因空值缺失時失敗，不靜默退回 env/SSH。empty env 視為未提供。

所有來源最終選出的值也套用相同 4096-byte/non-NUL/CR/LF 邊界；在 byte-oriented locale 下檢查，不以字元數代替 byte length。讀 raw FD 至 EOF，超過 4096 即失敗，不靜默截斷；FD sources 不共用同一個會被消耗的 input descriptor。

legacy direct flags 保留 operation-time compatibility，發出不含 secret 的 migration warning，列出對應 FD option 與 parent invocation argv 未被 retroactively protected 的限制；value 不可 forward 到 remote args、command 或 child。

替代方案：刪除舊 flags 會破壞既有 automation；把 env 放在 legacy CLI 前則改變目前實際優先序；兩者皆拒絕。

### Decision: Startup capture and dry-run scope gate

非 dry-run 必須在任何 `dirname`、`pwd`、build、`date`、`ssh`、`rsync`、firstboot 或其他 child 前，以 shell-only 步驟 capture 必要的 env/CLI source 到 private non-exported variables，先執行 `export -n SSH_PASSWORD SUDO_PASSWORD RDP_PASSWORD SSHPASS`，再 `unset SSH_PASSWORD SUDO_PASSWORD RDP_PASSWORD SSHPASS`。不再設定或 export `SSHPASS`；全案不啟用 `set -x`，任何既有 exported flags 都不能被第一個 child 繼承。

腳本最初的 shell builtin gate 先關閉 inherited xtrace；先只解析 dry-run 與非秘密 scope，跳過 secret option value 而不複製。dry-run 移除 export 並 unset 已存在的 secret env 後，以 builtin printf 印 non-secret planned stages 並退出。非 dry-run 才解析/保存 source，明確移除 private variables 的 export 屬性後開始 children；所有 secret emitter 使用 shell builtin printf，不讓外部 printf argv 帶值。

dry-run 先完成不讀 secret 的 target/mode/scope option gate，在讀任何 password FD、建立 pipe/frame/file 或複製 secret material 前返回；dry-run 不 build、不取 `date`、不啟動任何 child，也不輸出 direct flag value 或 env value。parent invocation 已包含的 legacy argv exposure 仍只以 warning/文件說明，不在 dry-run 中重新 materialize。

替代方案：先執行目前 top-level `SCRIPT_DIR="$(cd "$(dirname ...)" && pwd)"` 或先 build/date 才清 env，會讓第一個 child 繼承 caller secret，拒絕。

### Decision: Fresh FD per authenticated child

resolved secret value 可以留在 private non-exported shell variable，但 raw source FD 只讀一次並立即 close。每一次 SSH（含 reachability、remote stage、firstboot env query、remote bootstrap）、rsync 或其他 authenticated child 都建立全新的 readable pipe/FD；child/sshpass 讀完後 parent 立即 close，下一次不得重用相同 descriptor、pipe 或已消耗 offset。rsync 的 `-e` command 只能帶非秘密 options 與該次 numeric FD；`sshpass -e`、`sshpass -p` 與 secret-bearing argv 都禁止。

替代方案：重用單一 pipe 可使第一次成功而後續認證讀到 EOF，或迫使 secret 回到 env/argv，拒絕。

### Decision: Versioned non-eval secret frame

remote bootstrap 的 stdin frame 是固定 byte format，欄位順序固定為 sudo、RDP：

```text
frame = ASCII("SOLAR-DEPLOY-SECRET-FRAME/1") || LF
     || ASCII_DECIMAL(BYTE_LENGTH(sudo)) || LF || sudo || LF
     || ASCII_DECIMAL(BYTE_LENGTH(rdp))  || LF || rdp  || LF
     || ASCII("END") || LF
```

上式為 byte concatenation，不是 shell source；最後一個 LF 後必須立即 EOF，EOF 本身不是資料。magic 28 + 兩欄各 4102 + terminator 4 = 8236 bytes。

`<decimal byte length>` 必須是 ASCII canonical decimal `0`..`4096`，不得有 leading zero（`0` 除外），後接一個 LF。每個 raw value 必須剛好讀取該 length bytes，禁止 NUL、CR、LF，之後必須再有且只有一個 LF；spaces、quotes、dollar signs、semicolons、backslashes 與其他非 NUL/CR/LF bytes 原樣保留。length `0` 表示該欄未提供，沒有 payload 但仍有欄位 delimiter LF。固定 magic 是 28 bytes；每欄最多 4102 bytes；`END\n` 是 4 bytes；整個 frame 最大 8236 bytes。parser 必須逐 byte 驗證 magic、length、payload、delimiter、`END\n` 與 immediate EOF，拒絕 malformed length、extra bytes、truncation、overlong、invalid value bytes；不得使用 `eval`、base64 argv 或 secret-bearing command。

替代方案：以 shell word splitting、`read` trimming、command substitution 或 base64/quoted command 傳輸會改變 exact bytes 或製造可逆副本，拒絕。

### Decision: Target-side RDP file contract

非秘密 receiver 程式碼放在 scripts/raspi-onekey-deploy.sh 內並隨 SSH command 傳送；stdin 只承載 frame，不混入需 eval 的 script。receiver 以 remote login user 在 controlled mktemp parent 建立 mode 700 directory、mode 600 regular non-symlink RDP file 及本次 ownership marker。解析成功後，用新 pipe/builtin printf 將 sudo value 送到 sudo -S stdin；sudo child argv 只含 bootstrap 路徑、非秘密部署選項與 --rdp-password-file path。root 路徑不執行 sudo，但維持相同 file contract。

deploy/raspi-bootstrap.sh 驗證 path 的 parent/marker、owner（本次 remote login user 或 root）、mode、regular/non-symlink 與 containment，只傳非秘密 --rdp-password-file path，不讀 RDP payload；deploy/configure-lightweight-desktop.sh 開啟經相同驗證的檔案，唯一讀取最多 4096 bytes 並 close，之後使用 private value 完成既有設定。如此不重複讀同一 FD，也不把值重新 forward 到 argv/env。沒有增加新 source helper 檔案。

保留 direct target --rdp-password 相容時，bootstrap 必須先在自己擁有的受控 directory 建檔，再只向下游傳 file option；不得將 legacy value 再傳 child argv。caller 傳入的既有 file 可以驗證/使用，但非建立者不得清除。receiver/compatibility wrapper 各自只清理自己建立且持有 marker 的 exact paths；不能因 path 在 /tmp 或 caller 宣稱 owned 就授權刪除。

cleanup 只可針對本次精確產生、經 owner/regular/non-symlink/containment/marker 驗證的 file 與 parent；不得對 caller path 或任意組合 path `rm`。既有 configurator 將 RDP value 寫入 base64 credential config 的最終 policy 維持不變，該 persisted config 不屬於本案 transient-secret 不落地保證。

替代方案：把 RDP value 放在 `--rdp-password` child argv 或任意 caller path 交給 cleanup，無法建立 ownership 與不誤刪保證，拒絕。

### Decision: Cleanup observability boundary

local descriptor、pipe、frame buffer、target file/parent 在正常退出與可捕獲的 `EXIT`、`HUP`、`INT`、`TERM` 路徑關閉/清除；cleanup result 必須明示 `ok` 或 `unknown`。SSH disconnect、remote host loss 或 process crash 可能使 target trap 無法被確認，必須回報 `unknown` 並保留 exact-owned-path recovery instructions。SIGKILL、kernel kill、power loss 不可 trap，不能保證清理，也不能把所有 interrupt 宣稱已清除。recovery 只在重新驗證 owner、marker、regular/non-symlink 與 controlled containment 後清理 exact-owned paths。

替代方案：宣稱任何 signal、斷線或斷電都必然清除，會把未觀測的遠端狀態誤報為安全，拒絕。

### Decision: Preserve downstream RDP and sudo behavior

deploy flow 維持 SSH target、bundle upload、remote bootstrap 順序、root/sudo authentication、RDP `passwordless`/`system-password` 兩種功能與 shell-safe non-secret quoting。secure path 只替換 secret transit；不繞過 sudo、不停用 password prompt、不改 RDP final config policy。legacy direct target options 若保留，必須 warning、不可再向下游 forward secret，並提供 `--rdp-password-file`/FD 替代。

### Decision: Fake-process and cleanup fixture matrix

本案 apply 必須先回讀 `fix-runtime-restore-drill-verification` 已更新的 `scripts/deploy.test.mjs`，再追加 fake SSH/rsync/sshpass/sudo/target wrappers。sentinel 至少含 spaces、single quote、dollar sign、semicolon、backslash；assert raw value 以及 shell-escaped/quoted/base64 等可逆 representation 均不在 captured argv、command、environment、stdout、stderr 或 logs。測試必須包含至少三次連續 SSH+rsync pairs 的 fresh readable FD reuse、source precedence、invalid FD no-fallback、empty FD、dry-run no FD read/no material、legacy flag scenario、新 secure FD scenario、failure、catchable signal、remote disconnect unknown、truncation/extra frame 與 target file cleanup；只用 fake host/fixture values，不用 real credentials。

替代方案：只 assert raw substring 不存在或只 assert exit zero，會讓 shell-escaped/base64 副本與 FD offset/cleanup 缺陷漏過，拒絕。

## Implementation Contract

- Behavior：one-key deploy 保留 SSH reachability、bundle upload、remote bootstrap、sudo authentication、RDP passwordless/system-password 與既有部署順序；secure execution 不把 raw 或可逆 secret 放進 child argv、remote command、child environment、stdout、stderr 或 ordinary logs。legacy direct flag 的 parent argv exposure 只以明示 warning 限制，不納入 secure child guarantee。
- Source precedence：SSH=`--ssh-password-fd` > `SSH_PASSWORD` env；sudo=`--sudo-password-fd` > `--sudo-password` > `SUDO_PASSWORD` env > resolved SSH（僅前三者都未指定時）；RDP=`--rdp-password-fd` > `--rdp-password` > `RDP_PASSWORD` env。無 legacy `--ssh-password`。valid FD empty field 是未提供；invalid FD/frame 直接 fail、無 fallback；explicit empty legacy CLI 仍覆蓋較低 source。
- Startup/dry-run：在任何 `dirname`/`pwd`/build/`date`/child 前 `export -n` 並 unset `SSH_PASSWORD`、`SUDO_PASSWORD`、`RDP_PASSWORD`、`SSHPASS`；不使用 `set -x`。dry-run 在讀 FD、建 pipe/frame/file/material 前返回，且不 build/date/啟 child。
- Fresh transport：每一個 SSH、rsync、firstboot/authenticated child 使用獨立 fresh readable FD/pipe，使用後 close；resolved raw source 只 read 一次，禁止 offset/pipe 重用與 `sshpass -e/-p`。
- Frame：stdin 必須完全符合 version 1 magic、sudo/RDP fixed order、canonical decimal lengths、raw non-NUL/CR/LF payload、single LF delimiters、`END\n`、immediate EOF；每欄 <=4096 bytes、總長 <=8236 bytes，parser reject extra/truncation/malformed/overlong，不使用 eval/base64/secret-bearing command。
- Target channel：frame receiver 建立 validated file；sudo 只從新 stdin pipe 讀密碼，bootstrap 只驗證/forward --rdp-password-file path，configurator 唯一讀 RDP payload 一次並 close。mode/owner/marker/type/containment 都驗證；只有建立者清理 exact owned path。persisted RDP config 不在 transient guarantee。
- Cleanup：normal、`EXIT`/`HUP`/`INT`/`TERM` 可捕獲路徑只有在清理已確認時才回報 `ok`，否則為 `unknown`；local observer 在 remote disconnect/loss 時回報 `unknown`。SIGKILL 或 power loss 無法保證當下輸出或清理，後續 recovery 只在重新驗證後清除 exact-owned paths。
- Acceptance criteria：scripts/deploy.test.mjs fake processes 驗證受控 transport 的 raw/reversible argv/command/env/log isolation、至少三次 SSH+rsync fresh FD、precedence/empty/invalid FD/dry-run、frame byte limits、sudo→bootstrap→configurator read-once handoff、legacy/new secure scenarios 與 cleanup。不得連 real SSH/host 或使用 real credentials；不能把 hostile child diagnostics 當作本案可保證的輸出。先 focused test/review，最後 pnpm verify。
- In scope：只修改 scripts/raspi-onekey-deploy.sh、deploy/raspi-bootstrap.sh、deploy/configure-lightweight-desktop.sh 與 scripts/deploy.test.mjs 的必要區段。
- Out of scope：app、other changes、memories、pi5 skill、未列出的 deploy/scripts files、restore implementation、production state。本 propose 不改 main specs；未來正式 closeout 依 workflow spec sync。

## Risks / Trade-offs

- [Risk] legacy direct flags 保留 caller-level argv exposure。→ [Mitigation] 不 forward、warning 不含 secret、提供 FD/frame alternative，並在 tests 明示 parent invocation limitation。
- [Risk] sshpass FD 在 rsync child chain 的 inheritance 可能因 platform 行為不同。→ [Mitigation] 每次建立 fresh descriptor，以 fake process capture/readability 驗證；descriptor 無法繼承時 fail closed。
- [Risk] target temp-file cleanup 可能因 remote loss、SIGKILL 或斷電無法確認。→ [Mitigation] mode/owner/marker/containment checks、catchable trap、`unknown` status 與 exact-owned-path recovery；不宣稱必然清除。
- [Risk] RDP final config 仍有既有 base64 persistence。→ [Mitigation] 明確限定本案只修 transit；不把 persisted config 寫成已受 transient guarantee 保護。

## Migration Plan

1. 只在 `fix-runtime-restore-drill-verification` 完成後 apply；先回讀 shared `scripts/deploy.test.mjs` 最新內容，確認 restore fixtures，後案只追加 secrets tests。
2. 先建 red fake-process fixtures，再以最小 diff 實作 startup isolation、source precedence、fresh FD、versioned frame 與 target file channel；不得覆蓋前案測試。
3. 以 focused tests、final diff review、git diff --check 對照本案 requirement/scenarios；最後執行 pnpm verify。不使用 real credentials/host/Pi/production logs/field witness。
4. legacy flags 先維持 warning compatibility；未來 archive/spec sync 依正式 workflow，commit 仍需使用者明確要求，本 proposal 不執行。

## Open Questions

無待決產品問題；source precedence、empty semantics、frame bytes/limits、target option/ownership、cleanup unknown boundary、legacy warning 與 persisted RDP config scope 均是固定 handoff。
