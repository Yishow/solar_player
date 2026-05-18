## Context

`/sustainability` 的頁面外觀與 display page config 已經存在，但播放內容仍大量來自 `sustainabilitySummary` 與 `sustainabilityHighlights` mock。server 已提供 `/api/sustainability-story`，其中已有 provenance、periodized big numbers 與 story modules 的正式 runtime。

因此這頁當前最大的缺口不是版型，而是 runtime story 還沒有真正接到播放頁。若這條鏈不補上，Sustainability 在這輪 MVP 仍屬 mock-first，而非正式可追溯的內容面。

## Goals / Non-Goals

**Goals**

- 讓 `/sustainability` 以 `/api/sustainability-story` 作為 period、provenance、big numbers、highlight rail 與 story modules 的主要來源。
- 保留既有 FHD 幾何、hero media 與 display page config，不重做視覺。
- 保留 story payload 缺值、period 不完整或 module 不完整時的 readable fallback。
- 補齊 route adapter 與 targeted tests。

**Non-Goals**

- 不建立新的 sustainability backend endpoint。
- 不重做 hero、cards 或 highlight rail 幾何。
- 不把這頁和其他 monitoring/story 頁面併成同一個 change。

## Decisions

### Use one sustainability story payload for all periodized runtime blocks

決策：period selector、big numbers、provenance、highlight rail 與 modules 都由同一份 sustainability story payload 驅動。

理由：這能避免某些區塊跟著 period 切換，某些區塊卻仍留在 mock 或別的 period。

### Preserve page config as visual layout only

決策：hero 文案與版位幾何依然由 display page config 控制；story payload 只負責 runtime data 與 modules。

理由：把 story data 和 layout config 分開，之後 editor/config 才不會污染 runtime content。

### Fallback incomplete story content without collapsing the page

決策：若 story 缺少特定 period、provenance 或 module 內容，頁面使用可讀 fallback，而不是直接中斷 render。

理由：永續頁有很多半結構化內容，最需要明確的 fail-soft 策略。

## Implementation Contract

1. `/sustainability` SHALL 以 `/api/sustainability-story` 的 selected period payload 作為主要播放來源。
2. provenance、periodized big numbers、highlight rail 與 story modules SHALL 跟隨同一份 story payload，不再各自依賴 mock 或 page-local composition。
3. display page config 與 FHD 幾何 MUST 維持現況，這次 change 不重開 reference 視覺調整。
4. 當特定 period、provenance 或 module 缺值時，頁面 MUST 保持完整與可讀，並採用明確 fallback。
5. targeted tests SHALL 覆蓋正常 story、period 切換、缺 provenance、缺 modules 與 request failure 情境。

## Risks / Trade-offs

- 若部分區塊仍依賴 mock，period 切換時會出現混 period 的內容。
- 若 module fallback 不清楚，半結構化內容很容易直接變空白區塊。
- 若沒有驗證 request failure 與 partial story，這頁最像正式內容頁，現場失敗也最顯眼。
