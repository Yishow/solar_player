## Context

page freeform object runtime 讓 page config 與 playback 能保存並渲染自由物件，但 operator 仍需要在既有 Display Pages Editor 中新增與管理這些物件。現有 editor 已具備 page selector、canvas、inspector、region navigation、geometry clipboard 與 draft lifecycle，代表最穩的方向不是重做一套新 editor，而是把 freeform objects 納入現有 authoring workflow。

這個 change 的核心是：如何在不破壞 seed-backed regions 與 card rails 的情況下，加入一層 object-aware selection、ordering 與 visibility controls。

## Goals / Non-Goals

**Goals:**

- 在 Display Pages Editor 中支援 page freeform objects 的新增與編輯。
- 用 object list 解決被遮蔽或太小而難以點選的自由物件。
- 支援排序、鎖定、顯隱、刪除與選取狀態同步。
- 支援 duplication 與 asset-library-backed source picking，降低重複裝飾與素材挑選成本。
- 讓 canvas、inspector、draft save workflow 可理解 freeform objects。

**Non-Goals:**

- 不在這個 change 內提供文字物件。
- 不在這個 change 內新增資產管理頁。
- 不在這個 change 內把 shell objects 併入 page editor。
- 不在這個 change 內重寫既有 page region schema 或 card rail editing model。

## Decisions

### Extend Display Pages Editor with an object layer list instead of a second editor

page freeform object authoring SHALL 直接擴充 Display Pages Editor，而不是建立獨立 page-object editor route。這能沿用既有 page draft、preview、publish、validation 與 keyboard workflow，減少 operator 在多個 editor 間切換。

替代方案是新增第二個 page object editor。那會把同一頁內容拆成兩套不一致的 draft surface。

### Treat freeform objects as generated authoring items alongside seed-backed regions

freeform objects SHALL 以 generated authoring items 的方式掛入 editor state，與 seed-backed regions 並存，但不假裝成 seed region。這讓 object layer 可以有自己的 type、source 與 z-order controls，同時不污染既有 region schema 的 ownership。

替代方案是把 freeform objects 硬塞進 region schema。那會讓 page schema 充滿為自由物件而生的例外欄位。

### Make object list the authoritative picker for layer and visibility operations

canvas 在自由物件重疊時不適合作為唯一選取方式，因此 layer、visibility、lock 與 delete SHALL 以 object list 為 authoritative entry point。canvas 點選與拖曳是輔助，但物件列表必須能精準操作每個 object。

替代方案是沿用目前 region tree 作唯一導航。那對自由物件來說語意太弱，也難承載 layer 操作。

### Use asset-library-backed pickers for asset-image and icon-asset objects

`asset-image` 與 `icon-asset` page objects SHALL 使用 asset-library-backed pickers，而不是讓 operator 輸入 raw asset ids。picker 需能依 category 與 usageScope 過濾出對 page objects 合法的資產，這樣 page object authoring 才能和後續 asset catalog 成為同一套操作語意。

替代方案是只提供文字欄位輸入 asset id。那會把最常見的選材工作退回低階資料操作。

### Support duplication for repeated page accents and icons

page object authoring SHALL 支援 duplication，讓 operator 能快速複製線條、圖像或 icon accent 後再調整位置與層級。這對圖片框線、角標與多段裝飾線很常用。

替代方案是每次都建立新物件。那會增加重複設定與操作成本。

### Constrain canvas interactions to freeform objects without destabilizing existing region editing

自由物件的拖曳/選取/框線顯示 SHALL 走現有 canvas interaction primitives，但不可讓既有 page regions、card rails 或 clipboard workflow 失效。必要時應讓 freeform objects 使用明確的 item type 分支，而不是修改所有 region 分支的預設行為。

替代方案是把現有 canvas interactions 全面抽象化重寫。那對第一波 scope 來說風險過高。

## Implementation Contract

**Behavior**

- operator 可在 Display Pages Editor 中新增、選取、刪除 `line`、`asset-image`、`icon-asset` page objects。
- page object list 可直接選取物件，並執行前後層排序、鎖定、顯隱、複製與刪除。
- 選中的自由物件會同步到 canvas overlay 與 inspector，並走既有 page draft save lifecycle。
- 既有 seed-backed regions 與 card rails 仍可被編輯，不因 freeform objects 加入而失效。
- asset-image 與 icon-asset 物件可透過 asset library picker 指派來源，而不是輸入 raw asset id。

**Interface / data shape**

- editor state 需能同時持有 seed-backed selection 與 freeform object selection資訊。
- object list row 至少包含 label、type、visible、locked、z-order controls、delete action。
- object list row 至少包含 duplication action；asset-backed object 的 inspector 需顯示目前來源摘要與 picker 入口。
- inspector 需依 object type 暴露 frame、source 與 style fields，而不是只顯示 generic JSON blob。

**Failure modes**

- object source payload 不完整時，editor 必須顯示 validation 或 diagnostics，而不是在 save 後才暴露問題。
- duplicated object 不得重用 source object 的 `id`；若複製資產物件，來源引用可沿用，但 geometry 與 z-order 需能獨立調整。
- 若 object list 與 canvas selection 暫時不同步， SHALL 以 object list 的當前選擇為主並重新對齊 overlay。
- page object 編輯失敗不得覆蓋 seed-backed regions；draft mutation 需維持對各資料群組的局部更新。

**Acceptance criteria**

- editor route tests 可驗證新增、選取、刪除、排序、鎖定與顯隱行為。
- object list tests 可驗證 list-driven selection 與 canvas overlay 同步。
- `pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` 通過。
- `spectra validate --strict --changes add-display-page-freeform-object-editor` 通過。

**Scope boundaries**

- In scope: Display Pages Editor 內的 page object list、selection、reorder、lock/hide、save flow。
- Out of scope: shell editor、文字物件、asset library management page。

## Risks / Trade-offs

- [風險] editor state 同時管理 regions 與 freeform objects 會增加 selection 複雜度。 → Mitigation：以 generated authoring item 分支明確區分兩類選取，不重寫所有 region schema。
- [風險] list 與 canvas 雙入口可能出現同步 bug。 → Mitigation：以 object list 為 authoritative picker，並用 route-level tests 鎖住同步行為。
- [風險] 第一波若過度追求拖曳互動，可能影響既有 region editing 穩定性。 → Mitigation：先確保新增、選取、排序、鎖定、顯隱完整，拖曳沿用現有最小必要能力。
