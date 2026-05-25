## Context

`/display-pages/editor` 目前的 canvas workflow 已經具備 region 選取、drag/resize、zoom/pan、keyboard nudge 與 locked region 保護，但互動回饋大多停留在半透明選取框與單一 resize handle。`canvasInteractions.ts` 已能算出 boundary guides，卻沒有對 operator 呈現出來；同時，版面調整時也缺少接近 reference 稿的全頁 guide layer、可切換的框線模式，以及可確認目前量測是否對應設計尺寸的明確座標映射。

這個缺口對五個 display 頁都成立，尤其是像 Overview、Solar、FactoryCircuit、Images、Sustainability 這些有明確 header / hero / content / footer 節奏的畫面。使用者已明確指定：guide 與量測都要畫在 `DisplayEditorCanvasCard` 內的 viewport 裡，也在那裡操作；但這塊 viewport 的 DOM 尺寸不必然等於設計尺寸，因此 editor 需要同時管理 viewport space 與 design space。預設 design space 是 `1920x1080`，若 viewport 足以 1:1 容納該設計尺寸，則映射比例可退化為 `1`。

## Goals / Non-Goals

**Goals:**

- 讓 edit mode 的 canvas 在 `DisplayEditorCanvasCard` viewport 內顯示接近 reference 稿節奏的整畫虛線 guide，幫助 operator 快速比對 header、hero/content、footer 與主要內容邊界。
- 讓 selected region 與 active drag/resize interaction 在 canvas 上直接顯示可讀的尺寸與邊界距離資訊。
- 讓 operator 可在 controls 區切換「點中的畫」與「全畫」兩種 overlay/框線模式，並調整 design-space 基準尺寸。
- 讓 operator 可在 controls 區切換 guide 刻度/座標軸、region 名稱標籤、中心線，以及 full-canvas 模式下非選中框線的強度與可操作性。
- 延用既有 region geometry、card rail constraint、zoom/pan 與 locked region contract，不重做 editor 資料模型。
- 讓五個 display 頁與 card rail child card 都遵守同一套 overlay feedback 規則。
- 記住最近一次使用的 overlay preset，讓 operator 回到 editor 時延續偏好。

**Non-Goals:**

- 不新增自由標尺、任意註記、吸附到任意 region 的設計工具能力。
- 不變更 live playback runtime、page config payload 或 publish API。
- 不重新設計 inspector、region tree、header/footer shell 或整個 preview card 樣式。
- 不要求這次同時解決所有非 editable 裝飾元素的 reference 對齊問題。
- 不引入新的全域設定頁；overlay 選項只存在於 `DisplayEditorCanvasCard` 的 controls 範圍內。
- 不在這個 change 內引入任意兩個 region 之間的量測、snap/distribute 工具或多選幾何操作；那些能力另開 change 處理。

## Decisions

### Separate persistent page guides from transient interaction measurements

決策：把 overlay 分成兩層。第一層是 edit mode 開啟時即可見的 page guide layer，用來表達全頁主要水平/垂直節奏；第二層是只跟 selected region 或 active interaction 綁定的 measurement layer，用來顯示 width、height 與到容器邊界的距離。

理由：reference 圖表達的是整頁節奏，不只是拖曳當下的 feedback；但尺寸讀值若永久顯示在所有 region 上，畫面會過度擁擠。拆兩層能同時滿足 reference 對齊與操作可讀性。

替代方案：只做拖曳中的暫時 guide。拒絕原因：這無法回應「平常就看得到接近設計稿的虛線節奏」的需求。

### Map `DisplayEditorCanvasCard` viewport space to configurable design space

決策：guide、selection frame 與 measurement overlay 都必須畫在 `DisplayEditorCanvasCard` 的 viewport 內，但其幾何與量測邏輯必須優先使用可設定的 design space。預設 design space 為 `1920x1080`；當 viewport 可 1:1 容納該尺寸時，映射比例為 `1`，否則依既有 canvas scale / zoom 換算 viewport pointer 與 design coordinates。

理由：使用者明確要求「在這一區畫、在這一區調整」，但不接受把這一區的 DOM pixel 直接當成實際尺寸。分清 viewport space 與 design space，才能讓 overlay 既貼著目前操作區，又維持 FHD 預設下的真實量測語意。

替代方案：直接把目前 viewport pixel 當成量測尺寸。拒絕原因：會讓小尺寸 viewport 上的 guide 與數值失真，無法對應實際設計尺寸。

### Expose overlay display modes in `DisplayEditorCanvasCard` controls

決策：在 `DisplayEditorCanvasCard` 現有 controls 區新增 overlay 設定，至少包含 design-space 尺寸基準，以及「點中的畫」/「全畫」兩種顯示模式。這些模式控制 guide 與框線的顯示範圍，而不是改動底層 region geometry。

理由：使用者已指定設定入口就在 preview 卡上方的 controls 區。把模式切換放在這裡，operator 不需要離開目前的視覺上下文，就能調整 overlay 行為。

替代方案：把設定藏進右側 inspector。拒絕原因：這不是某個 region 的屬性，而是整個畫布操作模式。

### Persist overlay presets and expose display-density controls

決策：overlay controls 不只切換 selected-only / full-canvas，還要管理刻度/座標軸、region 名稱標籤、中心線，以及 full-canvas 模式下非選中框線的強度與可操作性。這些設定需要形成可記憶的 overlay preset，讓 editor 重新載入時能回到最近一次使用的視圖偏好。

理由：這些能力都屬於同一塊視覺閱讀層，而不是幾何模型本身。若不一起定義，後續很容易出現模式切了、標籤卻不跟著保存，或 full-canvas 已開但非選中框線仍然過強干擾操作。

替代方案：每次重新進入 editor 都回到固定預設。拒絕原因：對長時間調版的 operator 不夠實用，也違反這批需求希望把常用視圖行為留下來的方向。

### Limit measurement scope to known geometry and container bounds

決策：本次 measurement 僅顯示 editor 已知的幾何資訊，包括 selected/active region 的寬高，以及該 region 到其可編輯容器邊界的距離。一般 region 以 page content surface 為容器；card rail child card 以 parent rail bounds 為容器。

理由：這些數值已經存在於 editor contract 中，可靠且不需額外定義相鄰 region 關係。它能滿足「知道目前尺寸與對齊距離」的核心需求，同時避免 scope 膨脹成任意兩區塊之間的量測系統。

替代方案：顯示所有 region 彼此之間的最近距離。拒絕原因：需要引入更多碰撞/鄰接規則，複雜度明顯超過這次需求。

### Extend the canvas workflow with explicit overlay feedback state

決策：`useDisplayEditorCanvasWorkflow` 除了繼續處理 drag/resize/zoom/pan 外，還要對外提供目前可渲染的 overlay feedback state，至少包含 active rect、active guides、measurement constraint、interaction mode、design-space mapping，以及框線模式。`DisplayEditorCanvasOverlay` 只負責渲染，不自行重新推導互動數值。

理由：互動中的 geometry、constraint 與 guide 已經在 workflow 中被解析；由 workflow 統一輸出，可以避免 component 端重算、避免 DOM 量測依賴，也讓測試可直接驗證 state contract。

替代方案：在 overlay component 裡根據 pointer 事件與 DOM 位置重算尺寸。拒絕原因：狀態來源分裂，且很難穩定測試。

### Default region framing to selected-only with an optional full-frame mode

決策：畫布的預設框線模式改為只框目前 selected region；只有在 operator 明確切到「全畫」模式時，其他可編輯 region 才一起顯示框線參考。被選中的 region 在兩種模式下都必須維持最強辨識度。

理由：目前「選圖後全部都被框」會弱化選取語意，讓 operator 很難一眼分辨現在真正被操作的是哪一個 region。預設 selected-only 更符合編輯器基本行為，同時保留 full-frame 供版面總覽使用。

替代方案：保留現況，僅靠 selected 樣式顏色區分。拒絕原因：使用者已明確表示這樣不夠。

## Implementation Contract

**Behavior**

- 當 operator 進入 `/display-pages/editor` 的 edit mode，畫布 SHALL 顯示 page-level dashed guides；這些 guides 在切換 Overview、Solar、FactoryCircuit、Images、Sustainability 時 SHALL 依當前頁面佈局更新。
- 當 operator 在 `DisplayEditorCanvasCard` viewport 內編輯時，畫布 SHALL 以可設定的 design space 解讀 guide、框線與量測；預設 design space 為 `1920x1080`，若 viewport 可 1:1 容納該尺寸，映射比例 SHALL 退化為 `1`。
- 當 operator 選取具有 geometry 的 editable region 或 card rail child card，畫布 SHALL 顯示該區塊的尺寸資訊；當 operator 開始 drag 或 resize 時，尺寸與邊界距離 SHALL 以 design-space 數值即時更新。
- 當 operator 在 controls 區切換「點中的畫」與「全畫」模式時，畫布 SHALL 立即更新 guide / 框線顯示範圍，而不得改動 region geometry。
- 當 operator 在 controls 區切換刻度/座標軸、region 名稱標籤、中心線、非選中框線強度或非選中框線可操作性時，畫布 SHALL 在同一 viewport 內立即反映設定變化，而不得改動 region geometry。
- 當 region 被 lock 時，region 仍 SHALL 可被選取，但 SHALL NOT 啟動 drag/resize 互動，也 SHALL NOT 顯示誤導性的 active resize measurement state。
- 當 page 或 node 沒有 geometry 時，editor SHALL 不渲染對應 measurement overlay，而不是猜測位置。
- 當框線模式為預設 selected-only 時，未選中的 region SHALL NOT 顯示與 selected region 同級的外框；切到 full-frame 時，其他 editable region 才 SHALL 一起顯示參考外框。
- 當 operator 重新進入 editor 時，最近一次儲存的 overlay preset SHALL 重新套用到 controls 與 overlay 呈現；若 preset 無法解析，editor SHALL 回退到預設 preset 而不阻斷編輯。

**Interface / data shape**

- `DisplayEditorCanvasOverlay` 需要接受可渲染的 guide/measurement state，而不只是一組 regions 與 selected id。
- canvas interaction state 需要能表達：目前是否 idle / drag / resize、active region frame、guide lines、measurement 所依附的 constraint bounds、目前的 design-space 基準尺寸與 overlay display mode。
- `DisplayEditorCanvasCard` controls 需要有明確的設定 contract，至少能切換 overlay display mode，並宣告目前 design-space 尺寸設定。
- `DisplayEditorCanvasCard` controls 需要有明確的設定 contract，至少能切換 overlay display mode、guide 刻度/座標軸、region 標籤、中心線、非選中框線強度/可操作性，並宣告目前 design-space 尺寸設定與目前使用的 preset。
- page-level guides 需要有明確的來源 contract；apply 階段可以選擇由既有 region geometry 聚合，或補一層 page guide descriptor，但輸出必須仍是固定 design-space 座標中的水平/垂直 guide 集合。

**Failure modes**

- 若某頁無法解析 guide source，editor SHALL 回退為只顯示既有 selection overlay 與可用的 measurement state，不得阻斷頁面編輯。
- design-space 設定或 viewport 映射失敗時，editor SHALL 回退到最近一次可用的 design-space 設定或預設 `1920x1080`，不得把量測直接降級為未知 DOM pixel。
- overlay preset 無法解析時，editor SHALL 回退到預設 preset，並保留可編輯的畫布本體，不得因為偏好設定錯誤讓 editor 空白或失去互動。
- zoom/pan 只影響 overlay 呈現位置與縮放，SHALL NOT 改寫任何 region geometry。
- overlay feedback 缺失或 guide 為空時，草稿保存、發布與其他 editor 功能 SHALL 繼續可用。

**Acceptance criteria**

- Web 測試需要覆蓋 edit mode 下的 page guide rendering、overlay mode 切換、selected-only framing、刻度/座標軸、region 標籤、中心線、preset 恢復、locked region 行為，以及 card rail child card 使用 parent bounds 量測的場景。
- geometry helper / interaction 測試需要覆蓋 viewport-to-design-space 映射、boundary guide 與 measurement constraint 對應的數值案例。
- 至少一個 `/display-pages/editor?page=overview` 或其他代表頁的手動檢查需要確認 guide 與 preview 在 zoom/pan 下仍對齊。
- `spectra analyze add-display-editor-dimension-guides --json` 與 `spectra validate add-display-editor-dimension-guides` 必須可通過。

**Scope boundaries**

- In scope: page guide overlay、viewport-to-design-space mapping、overlay display mode controls、guide 刻度/座標軸、region 標籤、中心線、overlay preset 記憶、selected-only framing、selected/active region dimensions、container-bound distance labels、rail-card parent-bound measurement、測試更新。
- Out of scope: 任意 region-to-region ruler、自由註記工具、publish/runtime payload 變更、shell redesign、與 overlay 無關的 editor 偏好設定系統。

## Risks / Trade-offs

- [Risk] 全頁 guide 與 measurement 同時出現後可能造成畫面擁擠。 → Mitigation: page guide 與 active measurement 分層，並限制 measurement 只跟 selected/active region 綁定。
- [Risk] 不同頁面若 guide 來源規則不一致，可能出現某些頁 guide 過多或過少。 → Mitigation: 先以五頁共通的主要版面帶與 editable geometry 為準，避免一次追求所有裝飾元素。
- [Risk] viewport 與 design space 的映射若處理不一致，會出現拖曳準星與量測數值不同步。 → Mitigation: 將 mapping state 收斂到單一 workflow contract，避免 overlay 與 interaction 各自重算。
- [Risk] zoom 很小時尺寸標示可能失去可讀性。 → Mitigation: apply 階段需為 measurement label 設最低可視策略，例如縮小樣式或在低縮放時隱藏次要距離標示。
