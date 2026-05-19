## Context

5 個 display 頁的整體設計語言不只由 card 決定。hero title group、eyebrow、subtitle、title emphasis、gold line、leaf ornament、slide counter、arrow、period chip、status/provenance block 等 page chrome 目前仍大多寫死在 page-local CSS 與 component。editor 雖能改文案與幾何，卻無法改這些非 card 的外觀節奏，因此整頁視覺校正仍得回到程式碼。

本 change 要補的是 page chrome 的 persisted appearance contract，讓 5 頁可在 editor 做細緻但有限度的視覺調整，同時保持資料來源與內容槽位不變。

## Goals / Non-Goals

**Goals:**

- 讓 5 個 display 頁可在 editor 持久化調整 hero chrome typography 與 page-specific chrome module appearance。
- 將 hero title group、ornament 與 page module appearance 拆成獨立 override 群組，避免任何一組調整都要動整頁 CSS。
- 讓 preview、save、publish、playback 共享同一份 chrome override contract。
- 對缺漏欄位提供 seed fallback 與 reset 行為。

**Non-Goals:**

- 不處理 KPI/info card 內的 typography、icon source、media source。
- 不處理故事資料、playlist entry、period data 或 live metrics 內容本身。
- 不重做 region tree、shell、publish workflow 或整頁幾何重排。
- 不把所有頁面的 chrome 強迫抽成同構元件；保留 page-specific module 差異。

## Decisions

### Store page chrome overrides in per-page chrome groups rather than card region records

page chrome 不適合掛在 cardStyles 或 geometry rect 下，因此各頁 SHALL 新增獨立 `chrome` config 群組，用來承載 hero typography、ornament 以及 page-specific chrome module tokens。這樣可讓 `FactoryCircuit` 雖然沒有 shared card family，仍能與其他四頁共用 editor chrome workflow。

替代方案是把所有欄位附著在既有 hero/counter/status rect 旁。這會讓 geometry object 與 appearance object 混雜，降低 schema 可讀性，不採用。

### Separate hero chrome, decorative ornaments, and page modules into independent override groups

為了避免 scope 過寬，page chrome SHALL 分成三類：`heroTypography`、`ornaments`、`modules`。heroTypography 管 eyebrow/title/subtitle 的字級、行高、字距、強調樣式；ornaments 管 gold line/leaf 等純裝飾；modules 管 slide counter、period chips、status/provenance block、arrow 類非 card UI。這讓每頁只暴露自己擁有的群組，不需要假裝所有頁面有完全相同的 chrome。

替代方案是一個平面大物件裝所有欄位。那會讓 inspector 難以理解，也會讓沒有某種 chrome 的頁面仍背負空欄位，不採用。

### Keep data-bound modules content-driven while only appearance is overridable

`Sustainability` period chips、provenance block，`Images` counter，`FactoryCircuit` status block 等仍有資料綁定。本 change 只允許調 appearance token，不允許改內容來源、排序或資料更新時機。editor 可調的是 typography、padding、chip radius、gap、border/background tone、alignment 等外觀欄位。

替代方案是順便讓 editor 改資料文案來源或 runtime state 邏輯。這會跨進 story/runtime 能力，不採用。

## Implementation Contract

- **Behavior**: 當操作員在 editor 選到 hero copy、ornament 或 page-specific chrome module region 時，inspector SHALL 顯示對應的 chrome appearance 欄位。改動後 preview SHALL 即時更新，save/publish 後 playback SHALL 呈現相同外觀。
- **Interface / data shape**: 每個 page config SHALL 新增 `chrome` 群組，至少區分 `heroTypography`、`ornaments`、`modules` 三類或等價結構。不同頁只暴露自己支援的 chrome 區塊：例如 `Images` 包含 `counter` 與 `arrows`，`Sustainability` 包含 `periodChips` 與 `provenance`，`FactoryCircuit` 包含 `statusBlock`。
- **Failure modes**: 缺漏 token SHALL 回退 seed baseline；不支援的 chrome 群組 SHALL 不出現在該頁 inspector；非法數值 SHALL 產生 validation issue，但不得使整頁 preview 失效。
- **Acceptance criteria**:
  - 五個 display 頁都至少有 hero chrome override 可在 editor 中調整。
  - `Images` counter/arrow、`Sustainability` period chips/provenance、`FactoryCircuit` status block 這些 page-specific module 可各自調 appearance，而不改資料內容。
  - page-local CSS 不再是唯一的 chrome 真相來源，preview/runtime 都讀 persisted chrome config。
  - source-level tests 與 browser checks 可驗證 hero/chrome overrides 在 preview/live 之間一致。
- **Scope boundaries**:
  - In scope: hero typography、ornaments、page-specific chrome modules、editor schema/preview/runtime wiring、五頁 page-local CSS 消費新 token。
  - Out of scope: card internals、icon/media source、story/runtime data、geometry migration、shell/publishing。

## Risks / Trade-offs

- [Risk] chrome 群組過多會讓 inspector 看起來像在編整頁 CSS。 → Mitigation: 只納入高價值 appearance token，並按 hero/ornament/module 分群。
- [Risk] 某些 ornament 其實是由複雜 CSS 假元素生成，不易持久化。 → Mitigation: 先暴露尺寸、偏移、opacity、thickness 等高槓桿欄位，不要求任意形狀編輯。
- [Risk] page-specific module 差異大，容易在 schema 命名上分裂。 → Mitigation: 模組層只共用 workflow，不強推同一組字段；欄位名稱以 page-local 語意為準，但群組結構一致。
