## Context

目前 display page editor 直接讀寫單一 `regions` payload，儲存後就會立刻影響正式展示頁。這個模型對初版 editor 足夠，但一旦配置開始承接更多頁面內容、資產與播放條件，就會讓維運端缺少草稿隔離、發布節點、回滾歷程與發布前檢查。現有五個展示頁也都依賴 seed fallback 與局部 runtime 保護，因此新的發布模型不能破壞既有播放契約。

## Goals / Non-Goals

**Goals:**

- 建立 display page draft and live 雙軌配置模型，讓 editor 調整與正式播放隔離。
- 在發布前提供 layout safety guards，阻止越界、重疊、必要內容缺漏與非法數值進入 live。
- 為展示頁提供可配置 fallback policy，讓 live route 在資料、素材或配置有缺口時仍能穩定顯示。
- 讓管理端看見 draft、live、最近發布、回滾與驗證結果。

**Non-Goals:**

- 不在此 change 內補齊 editor 的拖拉與 schema-aware inspector。
- 不在此 change 內新增新的展示頁內容模組或圖片播放清單功能。
- 不在此 change 內定義 device-status 的完整觀測面板，僅提供此 change 需要的發布狀態資料契約。

## Decisions

### Separate draft and live config channels

display page config 改為以 page key 加 stage 管理，至少區分 `draft` 與 `live`。editor 的預設讀寫對象是 `draft`；正式展示頁只讀 `live`。發布動作將 `draft` 複製為新的 `live` 版本，而不是原地覆蓋，這樣才能保留回滾點與審計資訊。

替代方案是維持單一 config 並加上 `isPublished` 旗標，但這會讓回滾與比較變得模糊，也難以保證正式頁永遠不讀到半成品配置，因此不採用。

### Run layout safety guards before publish

layout safety guards 以 server-side validator 為主，web editor 可先做即時提示，但是否可發布由 server 最終裁定。檢查項至少包含幾何邊界、關鍵區塊重疊、必填欄位、合法數值與素材引用存在性。

替代方案是只在前端驗證，server 接受任意 payload。這會讓 API 無法防止惡意或過期 client 發送壞資料，因此不採用。

### Keep fallback policy in shared config metadata

fallback policy 不是 page-local if/else，而是 shared config metadata 的一部分。這讓 live runtime、editor 預覽與後續 status surface 都能以相同規則判斷資料中斷、缺圖與空內容時該顯示什麼。

替代方案是繼續分散在各頁 view model。這會讓 fallback 難以驗證，也不利於跨頁管理，因此不採用。

## Implementation Contract

- Behavior:
  - editor 可保存 `draft` 配置而不影響正式展示頁。
  - 管理者執行發布後，正式展示頁改讀新的 `live` 版本。
  - 管理者可查看最近一次發布資訊與至少一個可回滾版本，執行回滾後正式展示頁恢復到上一個可用版本。
  - 若 `draft` 未通過 layout safety guards，發布被拒絕，editor 會收到具體驗證結果。
  - live route 在資料、素材或配置不完整時依 fallback policy 顯示可播內容，而不是崩潰或輸出空白。
- Interface / data shape:
  - display page config API 擴充為可讀寫 `stage`, `version`, `publishedAt`, `publishedBy`, `validation`, `fallbackPolicy` 等欄位。
  - 新增 publish 與 rollback API，用於把 `draft` 提升為 `live` 或把 `live` 回退到指定版本。
  - validation result 需以可序列化 JSON 回傳，至少包含 `severity`, `code`, `message`, `regionId`。
- Failure modes:
  - validation 未通過時 publish API 回傳阻塞型錯誤與問題清單，不修改 live。
  - rollback 到不存在版本時回傳 404/業務錯誤，不修改 live。
  - live payload 損毀或 fallback policy 缺漏時，runtime 退回 seed-backed 安全版面，並保留可追蹤錯誤訊息。
- Acceptance criteria:
  - server tests 覆蓋 draft/live 讀寫、publish、rollback 與 validation block。
  - web tests 覆蓋 editor 顯示 draft/live 狀態、驗證訊息與發布成功後的同步。
  - `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test -- src/hooks/useDisplayPageConfig.test.ts src/pages/DisplayPagesEditor/index.test.tsx`、手動驗證 `/display-pages/editor` 與任一正式展示頁可證明契約成立。
- Scope boundaries:
  - in scope: config stage model、publish lifecycle、validation、fallback metadata、editor status UI。
  - out of scope: editor 拖曳操作、asset picker、rotation plan、device-status 完整觀測面板。

## Risks / Trade-offs

- [Risk] draft and live 雙軌會增加資料表與 API 複雜度 → Mitigation: 用共用 envelope 與明確 stage 欄位，避免 page-local 分岔。
- [Risk] 過嚴的 validation 可能阻塞正常編輯 → Mitigation: 區分 warning 與 blocking error，只有 blocking error 阻止 publish。
- [Risk] fallback policy 設計過度抽象會拖慢落地 → Mitigation: 先限定在資料中斷、缺圖、空內容三類正式降級情境。
