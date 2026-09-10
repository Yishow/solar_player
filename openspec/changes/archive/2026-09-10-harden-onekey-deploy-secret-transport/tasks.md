## 1. 相依與測試基線

- [x] 1.1 確認 fix-runtime-restore-drill-verification 已完成實作並回讀 scripts/deploy.test.mjs 最新內容；保留其 restore fixtures，先執行 node --test scripts/deploy.test.mjs 記錄基線。只有前案完成且 focused suite 可用才開始本案，不覆蓋或重設前案測試。

## 2. 紅燈契約回歸

- [x] 2.1 依 Decision: Fake-process and cleanup fixture matrix，在 scripts/deploy.test.mjs 建立只使用 fake host 與 sentinel 的 child capture fixtures，涵蓋 source precedence、empty FD/env/explicit CLI、invalid FD no-fallback、第一個 child env isolation、inherited xtrace 與 dry-run 不讀 FD/不建 material/不啟 child；assert raw 與 shell-escaped/quoted/base64 可逆副本不進受控 argv、command、env 或 diagnostics，先確認 RED。
- [x] 2.2 在同一測試檔加入至少三次連續 SSH+rsync pairs 及 firstboot query 的 fresh readable FD assertions，並對 version 1 frame 建立 exact-byte round-trip、0/4096/4097-byte 邊界、NUL/CR/LF、canonical length、missing delimiter、truncation、extra bytes 與 immediate EOF 的 RED fixtures；sentinel 包含 spaces、single quote、dollar sign、semicolon、backslash，不連真實 SSH。
- [x] 2.3 在同一測試檔建立 sudo→bootstrap→configurator secure-file handoff 的 RED fixtures：mode/owner/marker/type/containment validation、唯一 payload reader、caller file 不被誤刪、normal/failure/catchable signal cleanup 與 remote disconnect unknown。保留既有 legacy update/dry-run、sudo/root、RDP passwordless/system-password scenarios，加入 secure FD scenario；測試不得改實際系統設定。

## 3. 有界傳遞與相容性

- [x] 3.1 依 Decision: Operation-time secret source and compatibility boundary，在 scripts/raspi-onekey-deploy.sh 實作 SSH FD>env、sudo FD>legacy CLI>env>resolved SSH、RDP FD>legacy CLI>env；每個 source descriptor read-once/close，不允許 alias 已消耗 source，統一 4096-byte 與 non-NUL/CR/LF gate。以 2.1 驗證 valid empty FD/env 續查、explicit empty CLI 保持選中、invalid/unreadable/overlong 一律非零且不 fallback，沒有新增 legacy --ssh-password。
- [x] 3.2 依 Decision: Startup capture and dry-run scope gate，在任何 path discovery/build/date/child 前用 shell builtins 關閉 inherited xtrace，非 dry-run capture private non-exported values 並移除 SSH_PASSWORD、SUDO_PASSWORD、RDP_PASSWORD、SSHPASS 的 export/變數。dry-run 只解析非秘密 scope 並在讀 FD 或建立 secret material 前退出；以 2.1 的第一個 child、乾跑與受控輸出 captures 驗證，secret emitter 不使用帶秘密 argv 的外部 printf。
- [x] 3.3 依 Decision: Fresh FD per authenticated child，讓 scripts/raspi-onekey-deploy.sh 的每次 SSH、rsync、firstboot/authentication 建立獨立 fresh pipe/FD 並在使用後 close，禁止 sshpass -e/-p、export SSHPASS 或重用 offset；以 2.2 的重複 authenticated pairs 驗證每次 exact bytes、descriptor inheritance 與關閉，不以第一次成功代替全流程。
- [x] 3.4 依 Decision: Versioned non-eval secret frame，在 scripts/raspi-onekey-deploy.sh 實作 local emitter 與內嵌 remote receiver，stdin 僅承載固定 magic、sudo/RDP canonical lengths、payload/single-LF delimiters、END LF 及立即 EOF，總長最多 8236 bytes。以 2.2 的 boundary/parser fixtures 驗證，非法輸入在 privileged bootstrap 前非零退出；不新增 helper 檔、不用 eval、shell splitting 或可逆 secret-bearing command。
- [x] 3.5 依 Decision: Target-side RDP file contract，receiver 建本次 owned mode-700 parent/mode-600 regular non-symlink file；sudo 密碼只走 fresh stdin，deploy/raspi-bootstrap.sh 驗證後只 forward --rdp-password-file path，deploy/configure-lightweight-desktop.sh 驗證並唯一讀取 payload 一次及 close。以 2.3 驗證 owner/marker/type/containment、read-once 與 caller file 不被非建立者刪除；final persisted base64 RDP config policy 不變。
- [x] 3.6 依 Decision: Cleanup observability boundary，為本案建立的 descriptors、pipes、frame buffers、target file/parent 設定 normal/error EXIT 與可捕獲 HUP/INT/TERM cleanup，只移除重新驗證後的 exact owned paths。以 2.3 驗證確認清理才報 ok，遠端失聯或無法確認報 unknown 並提供具體 recovery path；SIGKILL/power loss 不保證當下輸出或 trap cleanup，不清除任意 caller path。
- [x] 3.7 依 Decision: Preserve downstream RDP and sudo behavior，保持 SSH target、部署順序、sudo/root 與 RDP passwordless/system-password；legacy direct options 只輸出不含值的 migration warning，bootstrap 將 legacy value 轉為自有 secure file 後下傳 path，不再傳 secret argv。以 2.1/2.3 驗證原有 entrypoint scenarios、FD/file 替代、parent argv 限制及 persisted storage scope，不能繞過認證或改 sudoers。

## 4. 綠燈與交付閘門

- [x] 4.1 對 Provide a local Raspberry Pi kiosk deployment entrypoint 的全部原有及新增 scenarios 完成 GREEN；執行 node --test scripts/deploy.test.mjs，保留 restore tests、fake-process source/frame/FD/secure-file/cleanup assertions 的實際結果。不使用 real credentials、host、production logs 或部署驗收資料。
- [x] 4.2 review 最終 scoped diff 與 git diff --check，核對本案唯一 requirement、八個 Decisions、全部 scenarios 及四個 Impact 檔案；修正 findings 並重跑 focused suite。確認 no-leak assertions 限受控 transport/diagnostics，不宣稱防護 hostile child、parent 已暴露資料或既有 persisted RDP config；沒有 application、restore implementation、其他 changes 或未列出的 scripts/deploy 變更。
- [x] 4.3 review/focused tests 完成後以最終版本執行 pnpm verify，記錄 PASS/FAIL/NOT RUN；明列 real SSH、Pi、production、deployment、FHD 與人工 acceptance 未驗證。未來正式 closeout 的 main-spec sync 依 workflow，提交仍需使用者明確要求，本提案階段不實作或提交。
