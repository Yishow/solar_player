## Context

目前 display page config 已能保存 seed-backed regions、card rails、media sources 與 page chrome overrides，但還沒有一個專門承載「不屬於既有 region、卻需要進 live runtime 的自由物件層」。使用者希望把上傳素材、圖像裝飾、ICON 與線條獨立放進頁面內容區，這代表 page config 需要新增一個與既有 regions 並存、但不混淆 ownership 的 object layer。

這個 change 的責任不是做 editor，而是定義 page freeform objects 的儲存、播放與 publish 邊界，讓後續 authoring 可以建立在穩定 runtime 上。

## Goals / Non-Goals

**Goals:**

- 讓 display page config 可保存 page-level freeform object list。
- 第一波支援 `line`、`asset-image`、`icon-asset` 三種 object types。
- 在五個 playback pages 的 content surface 上渲染 freeform objects。
- 在 publish 前驗證 bounds、source payload 與 deterministic ordering。

**Non-Goals:**

- 不在這個 change 內提供 page freeform object editor UI。
- 不在這個 change 內新增文字物件、群組、遮罩、動畫或混合模式。
- 不在這個 change 內建立完整資產管理頁。
- 不在這個 change 內改寫既有 hero/card/media region 的資料結構。

## Decisions

### Store freeform objects inside page configuration envelopes

page freeform objects SHALL 跟著每個 display page 的 draft/live configuration envelope 一起保存，而不是另開一份 page-adjacent store。這可保持 page publish 的原子性：operator 發佈某頁時，該頁的既有 regions 與 freeform objects 一起進 live。

替代方案是為 freeform objects 開獨立 store。那會讓 page publish 出現雙軌一致性問題。

### Reuse shared object schema with content-surface mounts only

page freeform objects SHALL 重用 shared base object shape，但 mount 在第一波僅接受 page content surface，而不是 header/footer。shell 與 page objects 共用一份 object vocabulary，可讓 asset references、visibility、lock 與 z-order 語意一致。

替代方案是為 page objects 定義另一套 payload。這會讓後續 editor 與資產庫需要同時理解兩種 schema。

### Render freeform objects as a dedicated content layer

runtime SHALL 以 dedicated content layer 渲染 page freeform objects，而不是把它們插進任何既有 hero/card component。這能保持 object layer 對各頁 page-local layout 的低耦合，同時讓 line/image/icon objects 的 layer order 更可控。

替代方案是把不同物件分散到各 page component。那會讓新增一種 object type 時需要跨五頁同步修改多個 page-local 分支。

### Validate bounds, sources, and deterministic order before publish

page freeform objects SHALL 在 publish 前驗證 frame 是否留在 FHD content bounds 內、source payload 是否可解析、以及 ordering 是否 deterministic。runtime 不應該成為修壞資料的最後一道線。

替代方案是讓 runtime 直接裁切或忽略壞資料。這會讓 operator 在 publish 成功後才知道畫面不對。

## Implementation Contract

**Behavior**

- 每個 display page config 都可包含 freeform object list，且該 list 跟隨 page draft/live envelope 保存。
- runtime 會在 page content surface 渲染 `line`、`asset-image`、`icon-asset` objects。
- line、asset-image、icon-asset 都遵守 shared base object shape 與 deterministic order。
- publish 會阻擋超出 FHD content bounds、source payload 錯誤或 ordering 異常的 freeform object data。

**Interface / data shape**

- shared package 匯出 page freeform object unions、default list seed 與 validation helpers。
- page config 新增 freeform object collection，但不替換現有 `regions`、`media`、`card rails` 或 `page chrome` groups。
- runtime object layer 以 page config 的 freeform object list 與 page asset resolvers 為輸入。

**Failure modes**

- publish 階段若遇到 out-of-bounds 或 malformed object payload， SHALL 回傳 blocking validation findings。
- runtime 若碰到單一 asset 無法解析， SHALL 跳過該 object 並保留其餘 page content，不讓整頁 render failure。
- object type 不支援或 source mode 不完整，不得在 runtime 默默轉型；它們應由 validation 或 resolver diagnostics 明確處理。

**Acceptance criteria**

- shared or server tests 可驗證 page freeform object payload、bounds validation 與 ordering contract。
- page runtime tests 可驗證五個 playback pages 會渲染 freeform object layer 並保留既有 page content。
- `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test`、`pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` 通過。
- `spectra validate --strict --changes add-display-page-freeform-object-runtime` 通過。

**Scope boundaries**

- In scope: page object data model、runtime render、publish validation。
- Out of scope: editor UI、文字物件、asset library management UI、shell objects。

## Risks / Trade-offs

- [風險] 將 freeform objects 放進 page envelope 會讓 config payload 變大。 → Mitigation：第一波僅支援必要 object types，並保留 deterministic ordering 與輕量 payload。
- [風險] 五頁 page-local layout 差異大，可能讓 object layer 接口不一致。 → Mitigation：所有物件都掛在 shared content layer，而不是各頁 component 自行解釋。
- [風險] icon-asset 與既有 icon source modes 邊界可能混淆。 → Mitigation：page freeform object 的 `icon-asset` 僅代表獨立自由物件，不替換既有 KPI 或 node icon source contracts。
