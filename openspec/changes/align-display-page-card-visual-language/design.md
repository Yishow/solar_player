## Context

`displayPageCards` 已經提供共用的 frame、header、value-row、footer primitives，但目前只是結構共用，不是視覺 contract 共用。`Solar`、`Overview`、`Sustainability`、`Images` 仍各自覆寫 header 對齊、icon box 尺寸、title/subtitle 節奏、padding 與 footer 間距，導致同一個 card family 在不同頁面上呈現出不同的設計語言。

這個 change 的工作不是重新設計卡片，而是把既有共用 card family 收斂成單一可驗證的 visual contract。`Solar` 已經被使用者指定為 baseline，因此這次以 `Solar` KPI card 的 header 與 typography 節奏作為唯一真相來源；其他頁面只在保留內容型態的前提下對齊這套規則。

## Goals / Non-Goals

**Goals:**

- 讓 shared card family 的 header 對齊、icon box、title/subtitle 節奏、value row 與 footer 間距具備單一 contract。
- 保留 `Overview` sparkline、`Sustainability` growth note / ESG list、`Images` metadata strip 等 page-specific content slot。
- 讓 `Solar` 原本的 KPI icon 資產繼續作為 baseline，不再因共用化而被替換成不同圖像語言。
- 補上 regression coverage，避免未來再退回 page-local visual drift。

**Non-Goals:**

- 不改任何 page 的 FHD 幾何、card count、region mapping 或內容來源。
- 不把 `Factory Circuit` 納入這次 card visual language 對齊。
- 不碰 display editor、`region tree`、publish workflow、settings / status shell。
- 不把所有 icon 內容強制改成同一張圖；本次只統一 icon placement、box rhythm 與 baseline treatment。

## Decisions

### Use Solar card header as the single visual baseline

`Solar` 已經是目前最穩定、最被接受的 KPI card 視覺來源，因此 shared card family 的 header contract 直接以它為真相來源，而不是對四頁做折衷平均。這能避免 card family 再次退化成「共用 component + 各頁各調」。

替代方案是定義一套全新中介 token，再把四頁往中介 token 靠攏。這做法會增加抽象層，但目前需求不是重設設計系統，而是修正 drift，因此不採用。

### Keep page geometry fixed and constrain changes to internal card rhythm

使用者已多次明確限制不可重動 FHD card 幾何，因此這次只允許調整 card 內部節奏：header alignment、icon box、title/subtitle margin、value row、footer spacing。`left`、`top`、`width`、`height` 與 card 數量都維持現況。

替代方案是順手重排 card 內容區塊，甚至重算不同頁的內部區域分配。這會把工作擴成 layout alignment，不符合這次邊界，因此不採用。

### Preserve page-specific content slots while removing page-local header drift

`Overview`、`Sustainability`、`Images` 的差異應保留在內容 slot，而不是保留在 header 規格分裂。也就是說，頁面仍可各自渲染 sparkline、growth note、bullet list、metadata strip，但 header / icon / typography / spacing contract 應由 shared card family 控制。

替代方案是每頁保留少量 page-local override，只要求「大致看起來像同一家族」。這正是目前造成 drift 的來源，因此不採用。

### Lock the visual contract with source-level regressions and targeted browser checks

單靠 component 引用檢查不足以防止視覺 drift，因為問題主要出在 page-local CSS override。這次要補兩層驗證：source-level tests 鎖住 `Solar` asset-backed icon treatment 與 shared primitives usage；人工 / browser 驗證則確認跨頁 header alignment、icon box、typography 與 value row 的 computed style 對齊。

替代方案是只保留 build 與目前已有 render tests。這會讓未來再次出現「component 仍共用，但視覺 contract 已分裂」的回歸，因此不採用。

## Implementation Contract

- **Behavior**: `Solar`、`Overview`、`Sustainability`、`Images` 使用 shared display card family 時，header SHALL 呈現單一設計語言。這包含 header vertical alignment、icon box 尺寸與對位、title/subtitle typography rhythm、value row 對齊與 footer spacing。內容型態可不同，但 header 與 card 內部節奏不得再按頁分裂。
- **Interface / data shape**: 共用 contract 由 `DisplayCardFrame`、`DisplayCardHeader`、`DisplayCardValueRow`、`DisplayCardFooter` 與其配套 CSS 變數 / class semantics 承擔；頁面可傳入 page-specific icon node 與 footer/body slot，但 SHALL NOT 再以 page-local CSS 改寫 baseline header rhythm。
- **Failure modes**: 若某頁需要因內容密度保留例外，例外必須限制在內容 slot，不得回頭覆寫 header 對齊、icon box 或 typography baseline；若無法滿足，視為本 change scope 外，需另開 change 討論。
- **Acceptance criteria**:
  - `Solar` KPI cards continued to render original asset-backed icons instead of replacement SVG glyphs.
  - `Overview`、`Sustainability`、`Images` 第一層 card header 在 browser computed style 上呈現一致的 header alignment 與 typography contract。
  - `Overview` / `Solar` / `Sustainability` 的 value row 維持置中，且不改 card 外部幾何。
  - Targeted web tests、`pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`、`pnpm --filter @solar-display/web build`、`spectra validate --strict --changes align-display-page-card-visual-language` 通過。
- **Scope boundaries**:
  - In scope: display card family primitives, page-local card CSS overrides on `Solar` / `Overview` / `Sustainability` / `Images`, and regression coverage for the visual contract.
  - Out of scope: `Factory Circuit`, display editor, `region tree`, draft/live publishing, story data binding, or any geometry migration.

## Risks / Trade-offs

- [Risk] `Images` info card 與 monitoring KPI cards 的內容密度不同，若硬套同一 spacing 可能壓縮 metadata strip。 → Mitigation: 只統一 header / typography / footer rhythm，保留 info-card body 與 metadata slot 專屬節奏。
- [Risk] `Sustainability` 的 KPI 與 stat cards 含有 growth note / bullet list，若過度抽象化會把內容 slot 也一併僵化。 → Mitigation: contract 限定在 shared header 與 value/footer 節奏，內容 slot 繼續 page-local。
- [Risk] 只看 source test 仍可能漏掉 CSS drift。 → Mitigation: 保留 targeted browser computed-style 驗證作為 completion gate。
