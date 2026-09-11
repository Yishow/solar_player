## Context

secret receiver 的正常 cleanup 依賴 parent、payload、marker 完整驗證，但 receiver_cleanup 在驗證失敗後仍走較弱 fallback 刪檔。已用本機替身把 marker 改成無效內容及 mode 644，觀察到 exit 0、cleanup: ok、parent 消失。這是既有驗證契約的缺口。

## Goals / Non-Goals

**Goals:**

- 所有 transient path 刪除都必須先通過完整驗證；不確定時保留材料並誠實回報 unknown。
- 區分本 invocation 建立的 parent 與預先存在的 candidate，維持正常清理與 descriptor 關閉。

**Non-Goals:**

- 不改 frame、secret input precedence、SSH/sudo/RDP 政策或正式持久化設定。
- 不建立通用清理框架、不操作現場 Pi 或真實秘密、不擴大至 restore drill。

## Decisions

### 完整驗證是唯一刪除入口

receiver_cleanup 只有完整 parent/payload/marker 驗證成功後才能刪除本次精確路徑。失敗時不再用 parent-shape fallback 降低 marker owner、mode、magic、owner/file binding、regular/non-symlink、containment 與可讀性要求。拒絕「先刪 payload 再留下 marker」方案，因為驗證失敗不能證明那個 payload 仍屬本次操作。

### 建立狀態與 cleanup 結果

記錄 parent 確實建立的時點，不能因變數已有 candidate path 就取得刪除權限。尚未建立任何 owned material 時只關閉 descriptors，不清理 candidate；mkdir 失敗時既有 parent 與 sentinel 原樣保留。已建立 parent 但 marker 尚未完成或不能驗證屬於 partial setup，保留該 parent 及其內容，回報 cleanup: unknown。已建立材料且完整驗證、刪除確認成功才是 cleanup: ok。

### Unknown 必須影響退出與恢復資訊

沿用既有 handoff 的 cleanup ok/unknown 語彙。bootstrap 成功但 cleanup unknown 時整體非零；原 bootstrap 非零時維持失敗，不因清理覆寫成成功。仍須關閉 owned descriptors；輸出只有非秘密的 exact-owned recovery path 與驗證失敗原因，不輸出 payload、密碼或把未建立的 candidate 宣稱為 owned。任何後續刪除都需重新驗證，不能建議 blanket wildcard cleanup。

## Implementation Contract

- In scope：scripts/raspi-onekey-deploy.sh 的 SECRET RECEIVER、receiver_cleanup 與必要的建立狀態；scripts/deploy.test.mjs 的 receiver/local handoff fixtures。
- Interface：既有 receiver frame、env 與 public CLI 不變；cleanup: ok/unknown 保持可辨識。只在 unknown 且已知本次建立 parent 時提供精確恢復路徑。
- Behavior：invalid marker 的 content/mode/owner/binding/type/containment/unreadable 任一失敗，marker、payload、parent 都不能被此 fallback 刪除；部分初始化同樣 fail closed。正常 validated cleanup 與 signal trap 保持可用。
- Failure：刪除失敗或事後無法確認完成回報 unknown；pre-existing/caller-owned/symlink targets 與 sentinel 不受影響。descriptor cleanup 獨立進行，不以刪除成功為前提。
- Acceptance：安全本機 fixtures 使用獨立暫存根與 sudo/SSH/bootstrap 替身，驗證上述矩陣的檔案 bytes、路徑存在、輸出與 exit status；更新既有 partial marker stat failure fixture，使其期待保留及 unknown；補正常與 signal 清理證據。執行 shell syntax、deploy suite、兩軸 review、安全 audit 與 pnpm verify。
- Out of scope：真實 sudo/SSH、Pi 部署、跨 UID exploit 宣告、secret 協定重設與自動化未驗證恢復刪除；不增加 inode/FD 綁定的原子刪除或驗證後同 UID 並行換檔防護。

## Risks / Trade-offs

- [fail closed 留下暫存秘密] → 優先保全 ownership 不確定的路徑；已建立的 root-owned 0700 parent 仍有原本保護，回報精確路徑並要求恢復時重驗。
- [partial setup 測試原本要求零殘留] → 改成驗證保留、unknown 與非零退出，不能透過放寬 marker 檢查讓測試轉綠。
- [驗證與 pathname 刪除並非原子操作] → 本次修復完整驗證已失敗仍進行刪除的路徑；caller-owned/symlink sentinel fixture 在驗證前布置且清理期間不並行替換，不把此證據宣稱為同 UID 競態防護。
- [退出 trap 被重複觸發] → 建立狀態、descriptor 關閉與清理結果保持可重入，測試信號及原始非零退出不被吞掉。
