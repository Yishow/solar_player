## Context

目前這批頁面雖然都掛在同一個 management shell 下，但實際上分成三種成熟度不同的 surface：`/settings/images`、`/settings/mqtt`、`/settings/circuits` 已經部分吃到 shared management primitives；`/settings/playback` 仍保留大量 route-local card 與 preview CSS；`/device-status` 則另外長出一套 dashboard 語言。這代表後續若直接逐頁補功能，會持續把同樣的 banner、stat strip、status feedback、table shell 與 preview board 重複寫在各頁裡。

## Goals / Non-Goals

**Goals:**

- 為 settings/status 相關 surfaces 建立可共用的 semantic token 與 primitive contract。
- 讓後續 page-level changes 可以專注在資訊架構與功能完整，而不是再各自重畫 card、banner、table、status 與 summary 語言。
- 保留 management shell、editor handoff、readiness/status semantics 與 FHD canvas geometry。

**Non-Goals:**

- 不在這個 foundation change 內重做各頁的完整內容編排。
- 不重新打開 `/settings/assets` 或 `/shell-decorations/editor` 的資訊架構爭議。
- 不改動 API、資料模型或 display runtime contract，除非只是為了支援 shared primitive 的呈現資料。

## Decisions

### Define three semantic surface families

foundation 先明確分出三個語義層：operations surface、preview surface、status dashboard surface。這樣 `Playback Settings` 與 `Slideshow Preview` 可以共享 preview-oriented primitives，`Image/MQTT/Circuits` 可以共享 operations workspace primitives，而 `Device Status` 則共享 dashboard-level summary 與 diagnostics primitives，但不需要被硬塞成一般 settings 表單。

### Extract primitives at appearance level before geometry changes

foundation 先處理 token 與 primitive，避免一開始就把所有頁面的絕對定位、區塊順序、內容拆解一起重做。新 primitives 應先覆蓋 page title、section board、info banner、stat strip、status badge、table shell、sticky action area 等 appearance contract；各頁仍可保留自己的 geometry，後續 change 再決定是否要重排版。

### Keep settings family and status family visually related but contractually distinct

`Device Status` 需要沿用同一個品牌色彩、border、shadow、state tone 語言，但它是 observability dashboard，不應直接套用 settings card 與 form density。foundation 會讓兩者共用底層 token，而不是共用同一個 component density contract。

## Implementation Contract

**Behavior**

- settings/status surfaces SHALL 有一組共用的 semantic tokens，可描述 board、banner、stat、table、preview、dashboard summary 與 state tones。
- shared management primitives SHALL 能被 `Playback Settings`、`Image Management`、`MQTT Settings`、`Circuit Settings`、`Slideshow Preview`、`Device Status` 採用，而不要求它們先統一成同一種版面密度。
- page-level CSS SHALL 逐步從 hardcoded palette、radius、border、shadow、status background 遷移到 semantic tokens；若仍需 page-local styling，差異 SHALL 來自 page role，而不是新長一套未命名顏色系統。

**Interface / data shape**

- token contract 以 styles/tokens.css 中的 semantic custom properties 命名，至少覆蓋 operations surface、preview surface、status dashboard surface 三組角色。
- shared primitive contract 以 management components / CSS utilities 提供，可被頁面直接組合使用於 title、board、summary、status、table 與 action surfaces。

**Failure modes**

- 若 foundation 完成後，各頁仍需自行硬寫大部分 status/background/border/shadow 規則才能成立，視為 foundation 不完整。
- 若 foundation 把 `Device Status` 壓成一般 settings form density，或讓 high-risk settings 的狀態辨識變差，視為 regression。

**Acceptance criteria**

- 受影響頁面的 CSS/JSX 不再以 route-local hardcoded appearance 為主要來源。
- 共享 primitive 有對應測試，且各頁至少能以 analyzer / targeted web tests 證明 adoption contract 成立。
- 後續 page-specific changes 可以引用同一組 primitive 名稱與 token family，而不是再新增平行語言。

**Scope boundaries**

- foundation 只交付 token 與 primitive contract，不在此 change 內承諾所有頁面的最終資訊架構。
- page-specific feature completion 由後續 playback/images/mqtt/circuits/device-status changes 承接。

## Risks / Trade-offs

- [foundation 抽太薄，後續頁面還是各做各的] → 直接把 preview surface 與 status dashboard surface 納入 contract，不只抽 settings card。
- [foundation 抽太厚，反而綁死各頁差異] → geometry 與 page role 保留在頁面層，foundation 只定義 appearance 與 semantic surface。
- [device-status 被錯誤同化成 settings 頁] → 明確保留 status dashboard family，避免共享同一密度與布局假設。
