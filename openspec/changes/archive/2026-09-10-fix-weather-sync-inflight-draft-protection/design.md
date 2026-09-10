## Context

目前 useMqttSettingsData 的 loadWeatherSettings 會將 getWeatherSettings 回應直接寫入 weatherSettings 與 lastSyncedWeatherSettings。useMqttSettingsRemoteSync 透過 useDisplaySyncDraftGuard 處理 display:sync；現有 guard 只在事件進入時讀取 dirty，並在 reloadNow 完成後視為 reloaded，因此 clean → 開始 reload → 操作員修改 Weather → response 抵達的交錯會遺失輸入。現有 topic polling 已使用 mergePolledTopicMappings 保護本地 topic draft；本 change 只處理 Weather state，不改 broker 或 topic 流程。

相關頁面已有 draftSections.weather、RemoteSyncBanner 的 keep-editing／reload actions、Weather preview 與既有 settings/baseline pair。Weather settings 的 HTTP response shape 維持 WeatherSettings；本 change 不新增 server endpoint，也不改 persistence contract。

## Goals / Non-Goals

**Goals:**

- 以 request generation、mounted lifecycle、同步 local-mutation generation 與 dirty gate 保護每條 Weather settings 非同步 commit。
- 在 response 因本地 Weather draft 而延後時，保留 weatherSettings 與 lastSyncedWeatherSettings，並讓 pending remote change 可見。
- 定義 newest request、edit-and-revert、discard 後新修改、keep editing 與 unmount 的可驗證邊界。
- 保持 clean Weather reload 的 authoritative commit，以及既有 display:sync banner 操作語意。

**Non-Goals:**

- 不修改 broker settings 的 loading disabled 保護、broker save 或 connection behavior。
- 不修改 topic polling 的 merge、topic draft 或其他 draft section。
- 不新增 Weather API、server persistence、跨頁共用 editor 或全面凍結 UI。
- MQTT Weather 沒有 settings save owner；不修改 Data Hub 的 Weather save，不將 diagnostics/preview refresh 當作 settings save。
- 不改 preview composition、Weather layout、FHD surface 或部署流程。

## Decisions

### Decision 1: Weather request and local-mutation generations

useMqttSettingsData 集中管理 Weather request generation、mounted token 與 local-mutation generation。useMqttSettingsWeather 的 handleWeatherSettingChange、toggleWeatherField 及所有本地 Weather setter 入口在排程 state update 前同步推進 mutation ref；不可只在 effect 或目前僅清 messages/errors 的 markDirty 推導。操作員修改後又改回也已推進 generation。server commit 不冒充本地 mutation。

每次 read 捕捉最新 request token、mutation generation 與是否有 dirty draft；discard request 另捕捉點擊當下的 mutation generation。只有仍 mounted、request 最新、mutation 未變，且 request 開始時 clean 或帶本次 discard 授權，才可同時更新 draft/baseline。提交前也重讀 dirty/ref。舊 request 的 success/error/finally 不得改 Weather state、error、loading 或 pending；只有目前 request 可釋放自己的 loading，不得清除更新操作的 loading。

同一 gate 必須涵蓋 loadWeatherSettings，以及 non-polling loadMqttEditableModel await 後 applyMqttEditableModel 的 Weather 部分，包含 initial/cached bootstrap。後者只隔離 Weather pair，broker/topic 的既有 apply 行為不變。refresh/diagnostics 不新增 settings commit 或 save barrier。

替代方案是只用 AbortController 取消前一個 request。這不能保證 API 會停止已送出的請求，也不能處理 request 已送出後操作員才修改 draft 的競態，因此採用 generation 作為最後的 write barrier；AbortController 若現有 API 支援可作為效能最佳化，但不是正確性依據。

### Decision 2: Preserve Weather outcomes through the shared guard

內部結果明確區分 committed、deferred、stale/unmounted 與 latest failure，攜帶可回查的 operation token。最新有效 response 因 mutation 改變或未授權 dirty draft 而不能提交時，保留 Weather pair 並標記 deferred/pending；即使操作員已改回 baseline、dirty=false，也不能清 pending。obsolete request 不產生新的 pending，也不能清除目前 pending。

topicsAsPolling 的 loadEditableSettingsLane 仍保留 Promise<void> 介面；在 useMqttSettingsData caller 包裝 Weather callback、捕捉其 outcome，聚合完成後回傳給 useMqttSettingsRemoteSync，不能以 void completion 當作 committed。full-model Weather outcome 同樣傳遞。共享 loader 不在修改範圍。

displaySyncDraftGuard 增加 Weather opt-in 的 outcome/currentness 與 sticky-pending seam：apply/discard await 後須確認相同 token 的 committed 才清除；deferred/stale/error 不得被 completion 覆蓋。Weather deferred pending 不受原本 !isDirty effect 自動清除，其他 consumers 保持既有 void reload/clean effect 語意。RemoteSyncBanner 沿用現有 UI，不新增 layout。

替代方案是收到 display:sync 時全面凍結所有管理控制，或以整頁 JSON snapshot 判斷所有 section。前者會阻礙合法編輯，後者會讓 broker/topic 受到不必要的耦合，因此採用 Weather section-local dirty re-check。

### Decision 3: Discard authorizes only the draft present at the click

keep-editing 不發出 reload，保留 Weather draft、baseline 與 pending。discard/reload 啟動最新 request，授權範圍僅為點擊時的 mutation generation；若期間沒有新修改，成功可替換當時 dirty draft 與 baseline 並清 pending。若期間又修改、甚至修改後改回，response 必須 deferred，保留新 draft、舊 baseline 與 pending；不能把 discard intent 當作無限期覆寫權。

最新 reload 失敗保留 draft/baseline/pending，沿用 error boundary；error 是否仍可呈現也須通過 request currentness，不讓舊錯誤蓋掉新成功。unmount 使 request token 失效，晚到 success/error/finally 全部 no-op。沒有新增 save owner、cross-page event 或 Data Hub 寫入協調。

替代方案是只比較當下 dirty，或讓 discard 一律覆蓋；兩者都會漏掉 edit-and-revert 或點擊後的新編輯，因此使用同步 mutation generation。

## Implementation Contract

- Behavior：當 clean Weather surface 因 display:sync 或明確 reload 開始讀取後，操作員在 response 前修改 Weather 時，晚到 response 必須保留本地輸入與 dirty；頁面必須顯示 pending remote change。clean 且仍有效的 newest response 必須同步更新 draft 與 baseline。
- Interface / data shape：getWeatherSettings 仍回傳 Promise<WeatherSettings>；data controller 可擴充 Weather-specific outcome 與 mutation callback，state shape 不變。聚合 caller 捕捉 outcome，不修改共享 loader；guard seam opt-in，既有 void consumers 保持相容。
- Failure modes：obsolete success/error/finally 不修改 Weather state/loading/error/pending；最新 deferred response 保留 draft/baseline 並 sticky pending；latest failure 保留資料與 pending。只有同一仍 current 的成功 commit 可清除 pending。
- Acceptance criteria：新增 apps/web/src/pages/MqttSettings/useMqttSettingsData.test.ts，參照現有 jsdom/react-dom harness 掛載實際 data owner、remote-sync 與 Weather mutators。用受控 deferred promises 驗證 clean/edit/revert、toggle、discard 後新編輯、latest success/error、stale finally、unmount、initial/cached full-model；pure guard 與 source assertions 僅補充。保持 broker/topic 與一般 guard consumers 回歸。先 focused tests、final diff review，最後 pnpm verify；本 propose 階段不執行。
- In scope：proposal Impact 的十個既有 Weather/guard/presentation/test 檔案，加上一個實際 owner mounted test。
- Out of scope：server/API、Data Hub save、共享 editable loader、broker save/loading、topic merge、其他 changes、FHD/layout/deploy。此 propose 不改 main specs；未來 spec sync 依正式 closeout workflow。

## Risks / Trade-offs

- [Risk] 新增 callback 或 outcome 造成 stale React closure → mutations 同步推進 ref，mounted deferred-promise tests 驗證實際 wiring，不能只靠 pure gate tests。
- [Risk] pending state 在 clean response 後殘留 → 只由最新成功 commit 清除，且測試 deferred → discard/reload → success 的 state transition。
- [Risk] 共用 guard 變更意外影響 broker/topic → 將 deferred seam 限定 Weather reload path，並保留 broker/topic focused regression assertions。

## Migration Plan

不需要資料 migration 或 server rollout。apply 階段先加入 regression tests，再以最小的 Weather state/guard wiring 實作；rollback 只需回復本 change 所涉及的 scoped app/test diff，不觸碰既有 untracked changes。

## Open Questions

無；unmount、newest request、local-mutation generation 與 click-scoped discard 已固定。若 apply 發現需要跨頁或 API 變更，停止該部分並回報主代理。
