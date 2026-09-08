## Context

動機與實測證據見 `proposal.md` 和 follow-up review 的 N1、N2。設計基準為 `98979b6f46b124a7b568167e42cc9a261024fa18`。

目前 legacy MQTT 寫入會檢查 Solar／derived ownership，guided service 則只檢查 source 結構、token 與 meter_sources 內的衝突。另一方面 `persistAppliedSelector` 自行寫 mapping，更新時沒有同步 enabled；`syncSourceTopicMapping` 已有來源狀態同步責任，但 guided 路徑未使用它。

## Goals / Non-Goals

**Goals:** 把每個 guided 寫入都必須成立的 ownership 與 enabled 不變條件放回後端；用現有交易與 runtime owner 完成，不讓驗證只停在 UI。

**Non-Goals:** 不重整整個 MQTT service，不更換 selector 格式，不合併 discovery 與 production，不重設 meter epoch，不掃描或刪除正式環境中可能已存在的衝突 mapping。

## Decisions

### 1. 在可測試的共用邊界查詢現行 ownership

優先復用現有 Solar adapter identity helper、derived registry 的保留身分來源（包含停用項目）及 period metric 的既有權威目錄；必要時只抽出一個有明確輸入／錯誤輸出的 ownership 檢查。Preview 在發 token 前檢查；新的 apply 在既有 immediate transaction 內、任何來源與 mapping 寫入前再次檢查。

不採用前端禁選當唯一保護，也不在 guided service 複製一份 Solar prefix／derived 清單。前者可被 API 繞過；後者會讓兩個寫入入口再次分歧。未知／查詢失敗不得當成「沒有 owner」。

維持既有合法 idempotency receipt 的重播行為，但 route 在重試 runtime activation 前仍須確認當前 mapping／source 是可啟用的 owner；不能讓舊 receipt 成為接管新 owner 的通行證。此檢查不重做已提交的寫入。

### 2. 使用已保存的 source 決定 mapping enabled

以 `saveMeterSource` 的回傳值為準，而非信任另一份 request flag。保留 selector-aware upsert，再由單一同步責任設定 enabled／unit；或把該同步整合進 upsert 的一個明確 helper。二者只選最小且能被共同測試的方案，不建立可插拔 framework。

新增 mapping 不能固定 enabled=1；更新不能遺漏 enabled。來源、selector、mapping、audit、receipt 仍在同一筆交易內，任一失敗必須整體回復。非 identity 狀態修改不額外增加 source revision。保留 legacy precision、selector、其他 mapping 與原有 source lifecycle 的限制。

### 3. 設定提交後才處理 runtime，停用不冒充啟用

沿用既有 guided activation 與 MQTT runtime owner。衝突／交易失敗時不呼叫 activation；啟用時保持 saved、broker acknowledged、observed 三個不同狀態。停用來源不得因 shared topic 已 subscribed 就被標為自身 active；對 shared topic 的其他訂閱者不得做無條件 unsubscribe。

不讓資料庫交易等待 broker；這會增加鎖定時間且無法讓外部 broker 參與資料庫回滾。Broker 拒絕仍回傳可重試的 saved-but-not-active，而不是把已保存資料刪掉。

## Risks / Trade-offs

- [舊資料已佔用受管名稱] → 新操作先拒絕並提供診斷；不自動刪除或重新綁定。真正資料整理需另行授權及備份。
- [Preview 後 ownership 或 enabled 又改變] → Apply 重新檢查 ownership，保留 target snapshot 與 revision 衝突保護；不可為了新 helper 拿掉舊檢查。
- [抽共用 helper 牽動 legacy 行為] → 同跑 settings-mqtt 的既有測試，尤其 unrelated custom mapping、disabled legacy mapping 和 selector preservation。
- [將 source 的 enabled 和 broker subscribed 混為一談] → 回應與測試分開配置、訂閱、收值；用假的 runtime owner 或明確隔離 broker fixture 驗證，不連正式 broker。

## Verification Approach

先在現有 service／route 測試固定 N1、N2 的失敗案例。受管身分測試需先斷言 fixture 的確被現行 ownership helper 視為受管，例如 `factoryGeneration.totalKw`，不可誤用非受管的 `generationPower`。檢查 rejected preview/token、rejected apply 前後資料列、audit、receipt 與 activation call 數。

Enabled 測試要走「先保存 → 既有來源路徑停用 → guided 重新啟用」，再送受控有效封包驗證來源可更新；另外涵蓋 disabled insert、shared topic、rollback、lost-response／broker-refusal retry。每個測試只使用臨時資料庫及 fake transport。完成後重跑相鄰測試與 `pnpm verify`，並以最終 diff 做 Standards／Spec review。

## Migration Plan

不需要 schema migration 或資料回填。後續部署只在原有授權流程中發布修復版本；若另外取得正式環境盤點授權，可只讀回報既有 ownership 衝突，不能自動清除。必要回復使用前一個可用版本，但需說明回復會重新帶回本次保護缺口；此提案不執行部署或回復操作。
