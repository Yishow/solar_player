## Context

`/overview` 已有固定 FHD 畫布、display page config 與 KPI 版型，但資料來源仍主要依賴 `useLiveMetrics()` 與 page-local fallback。另一方面，server 已經提供 `/api/display-story`，且其中已包含 `overview.metrics` 與 `overview.summary` 的共享 monitoring story contract。

這代表 MVP 目前真正缺的不是新後端能力，而是播放頁尚未正式接到既有 story runtime。若這條鏈沒有補上，`Overview` 仍會和後續的 diagnostics、rotation review 與其他 story-driven 頁面維持兩套語意。

## Goals / Non-Goals

**Goals**

- 讓 `/overview` 以 `/api/display-story` 的 `overview` payload 作為 KPI 與 summary 的主要資料來源。
- 保留既有 FHD 版型、hero media、display page config 與 page-local 幾何，不重做視覺。
- 明確定義 story 載入失敗、payload 缺值或 freshness 降級時的 fallback。
- 補齊 route adapter、API client 與 targeted tests，讓這條資料鏈可驗證。

**Non-Goals**

- 不修改 `Overview` 的 reference-aligned 幾何與 CSS。
- 不新增新的 backend story endpoint。
- 不把 `Overview` 與 `Solar`、`Factory Circuit` 合成同一個 runtime change。

## Decisions

### Resolve Overview playback from the shared display-story contract

決策：播放頁的 KPI 與 summary 以 `/api/display-story` 的 `overview` payload 為主，而不是繼續在頁面內直接重組 socket metrics。

理由：server 已經集中處理 metric binding、freshness 與 summary fallback，前端若再各自組一次，只會讓 contract 漂移。

### Keep layout config separate from story data

決策：`display page config` 仍只負責版型、hero media 與幾何；story payload 只負責 KPI 與摘要內容。

理由：這樣可以維持 editor/runtime 邊界清楚，不把內容資料和畫面設定混成單一來源。

### Fail soft when story payload is unavailable

決策：若 `/api/display-story` 暫時不可用、回傳缺值或 freshness 降級，`Overview` 仍要顯示完整頁面，並回退到既有可讀 fallback。

理由：這輪目標是讓 MVP 可開跑，不是把頁面變成 API 成功才可播放。

## Implementation Contract

1. `/overview` SHALL 以 `/api/display-story` 的 `overview.metrics` 與 `overview.summary` 作為主要播放資料來源。
2. `Overview` 的 KPI card 順序、icon、英文輔助文案與 FHD 幾何 SHALL 維持現況，只有資料 adapter 轉為共享 story payload。
3. 當 story payload 缺少單一 metric、summary freshness 降級或 request 失敗時，頁面 MUST 保留完整版型，並顯示可讀 fallback 狀態。
4. `display page config` 的 hero 文案、hero media 與 card layout MUST 不因 story runtime 接線而改變來源責任。
5. targeted tests SHALL 覆蓋 story payload 正常、缺值、stale 與 request failure 等情境。

## Risks / Trade-offs

- 若前端同時保留過多 page-local metric 邏輯，之後容易再次漂回雙軌資料模型。
- 若把 summary 狀態和 layout config 綁在一起，後續 editor 變更會污染 runtime contract。
- 若沒有明確驗證 stale 與 request failure，MVP 會在 demo 時才暴露空白或錯誤摘要。
