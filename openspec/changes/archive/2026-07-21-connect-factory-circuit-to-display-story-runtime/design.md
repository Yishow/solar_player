## Context

`/factory-circuit` 的顯示頁已具備 FHD layout、slot rows、status tone 與 page config，但目前播放端仍以 `/api/circuits` 和 page-local fallback 混合組裝資料。與此同時，server 已經提供 `/api/display-story` 的 `factoryCircuit` payload，裡面有 slot binding、live power 與 alert reason 的共享 playback contract。

這造成目前播放頁和 diagnostics / readiness 看到的 circuit story 並不完全同源。MVP 若要宣稱這頁能正式開跑，播放端必須改為消費共享 story runtime，而不是繼續只靠管理端資料與本地推導。

## Goals / Non-Goals

**Goals**

- 讓 `/factory-circuit` 以 `/api/display-story` 的 `factoryCircuit` payload 作為 slot rows、binding state、live power 與 alert reason 的主要來源。
- 將 `/api/circuits` 留在設定與治理用途，不再作為播放 story 的主契約。
- 保留既有 FHD 版型、status block 與 display page config。
- 補齊 route adapter、fallback handling 與 targeted tests。

**Non-Goals**

- 不重做 Factory Circuit 的 FHD layout 或 editor schema。
- 不修改 circuits 管理頁的 CRUD 流程。
- 不把 playback story 接線與 circuit settings 綁成同一個 change。

## Decisions

### Use display-story for playback and circuits API for governance

決策：播放頁只吃 `factoryCircuit` story payload；`/api/circuits` 繼續服務設定面，不再直接驅動播放 story。

理由：播放語意與管理語意不同，前者要的是 slot binding 狀態、alert tone 與 fallback；後者要的是 CRUD 與設定欄位。

### Keep empty, loading, and degraded states visible

決策：shared story 缺資料、slot 未綁定或 request 失敗時，頁面保留 load rows、status 區塊與空狀態說明，而不是只回傳錯誤。

理由：這頁的價值在於即使資料異常也能告知現場現在缺什麼。

### Avoid page-local reconstitution of slot binding semantics

決策：slot binding、conflict、missing 與 alert reason 由共享 story payload 決定，前端不再重新推導另一份 slot binding 規則。

理由：這是 playback diagnostics 的核心契約，不能再分裂成 page-local 實作。

## Implementation Contract

1. `/factory-circuit` SHALL 以 `/api/display-story` 的 `factoryCircuit.slots` 與 `factoryCircuit.summary` 作為主要播放資料來源。
2. `/api/circuits` SHALL 僅保留給設定面使用，不再作為播放端組裝 slot state 的主要來源。
3. page-local layout、hero 文案、KPI geometry 與 display page config MUST 維持現況。
4. 當 story payload request 失敗、slot 缺綁定或 live power 缺失時，頁面 MUST 顯示可讀 degraded / empty / fallback 狀態。
5. targeted tests SHALL 覆蓋 bound、missing-slot-binding、conflict、missing-live-power 與 request failure 情境。

## Risks / Trade-offs

- 若播放端仍混用 `/api/circuits`，未來 settings 變更可能直接改壞 display story。
- 若 slot state 仍由前端自行推導，會再次與 readiness/diagnostics contract 漂移。
- 若沒有驗證 missing slot 與 conflict 情境，現場最關鍵的異常反而最晚暴露。
