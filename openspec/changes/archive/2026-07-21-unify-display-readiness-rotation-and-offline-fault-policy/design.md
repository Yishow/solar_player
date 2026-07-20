## Context

目前頁面健康判斷分散在幾個地方：

- readiness：MQTT mapping 與 circuit slot binding
- rotation conditions：published、asset health、metrics freshness
- fallback policy：page config 層級
- front-end offline redirect：只有在 no playable pages 時才導向 `/offline`

這四條鏈沒有統一，因此同一頁面可能同時是 readiness blocking，但 rotation 仍當成可播，最後前端繼續留在 playback 頁上顯示 fallback/mock。

## Goals / Non-Goals

**Goals**

- 建立統一 page eligibility contract。
- 明確區分可播放、可 degraded 播放、應 skip、應切 fault page 的條件。
- 讓 operator 能看到 skip/fault 的真正原因。

**Non-Goals**

- 不改單一 display page 的視覺內容。
- 不碰 shell 結構與 security。

## Decisions

### Readiness findings must affect rotation

決策：blocking readiness findings 不能只存在 diagnostics panel，必須進入 rotation eligibility。

理由：否則 readiness 綠燈/紅燈對實際播放沒有約束力。

### Mock/demo fallback must be policy-driven

決策：mock mode 或 placeholder fallback 只能在明確 policy 下允許，而不是自動默許所有 playback 頁繼續播放。

理由：這是避免 production 畫面長期看似正常、其實全靠 fallback 的核心。

### Report the dominant skip reason

決策：rotation 與 offline redirect 要能指出主導 skip/fault 的 reason hierarchy，例如 missing mapping、unpublished page、stale metrics、missing asset。

理由：使用者要求看程式碼層級缺漏，因此 diagnostics 不能只回 boolean。

## Implementation Contract

1. page eligibility SHALL 同時考慮 readiness、freshness、asset health、publish state 與 page fallback policy。
2. blocking readiness MUST 能讓 page 被 skip 或進入 fault mode，除非 page policy 明確允許 degraded playback。
3. front-end offline/fault routing MUST 使用 unified eligibility 結果，而不是只看 `hasPlayablePages`。
4. effective rotation 與 playback settings summary SHALL 顯示每頁 skip reason 或 degraded reason。

## Risks / Trade-offs

- 若 policy 太嚴，demo/mock mode 會不夠寬容。
- 若 policy 太寬，production 仍可能長期掩蓋缺資料。
- eligibility 邏輯若分散在 server 與 client 兩邊各算一次，極易漂移。
