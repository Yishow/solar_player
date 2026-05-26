## Context

shared shell decoration schema 只解決資料形狀與 publish validation，實際的 playback 與 management shells 仍依賴固定的 header/footer markup。現有 `DisplayCanvas` 會把 header、content、footer 放在同一個 1920x1080 surface 中，代表 shell decorations 若要穩定顯示，應該掛在既有 band 幾何內，而不是各 route 自己額外疊一層 page-local overlay。

這個 change 的責任是把 shell object 從資料契約接到 runtime shell render，同時維持現有 brand、time、weather、status 與 footer navigation 的互動性。

## Goals / Non-Goals

**Goals:**

- 讓 playback 與 management shells 從同一個 live shell decoration contract 渲染 header/footer objects。
- 在既有 shell bands 中渲染 line、asset-image、ornament-image，並維持 deterministic z-order。
- 保護現有 shell 互動元素，避免 decorations 擋住品牌入口、狀態 badge、footer links。
- 提供 asset missing 與 empty config 的 runtime fallback。
- 讓 shared shell decoration publish 後的 active shells 能重新讀取最新 live config。

**Non-Goals:**

- 不在這個 change 內新增 shell decoration editor。
- 不在這個 change 內新增 page-level freeform objects。
- 不在這個 change 內新增資產管理頁或 asset metadata 編輯功能。
- 不在這個 change 內重新設計 header/footer 主內容排版。

## Decisions

### Read live shell decorations through one shell runtime loader

playback 與 management shells SHALL 共用同一個 shell decoration loader，而不是由 AppHeader 與 AppFooterNav 各自獨立讀資料。這可避免兩邊對 live config、asset missing 與 fallback 寫出不同邏輯，也讓之後 display sync refresh 有單一接點。

替代方案是每個 component 自己 call service。那會讓 header/footer 對同一份 live contract 產生重複 fetch 與不一致 fallback。

### Mount header and footer object layers inside existing shell bands

shell decorations SHALL 掛在既有 header/footer bands 內部，與 shell markup 共享同一個 1920x1080 canvas。這樣可直接沿用現在的 FHD scaling 與 band 幾何，不需要為 decorations 再引入第二層座標系。

替代方案是以 viewport-level absolute overlay 疊在整個頁面上。那會繞過目前 shell canvas contract，造成 FHD 幾何、縮放與 pointer-events 更難對齊。

### Keep shell decoration layers passive to shell interactions

shell decoration layers SHALL 預設為 passive render layers，不攔截 pointer events；需要保留互動的 shell 主內容仍由既有 header/footer 元素處理。layer 順序也 SHALL 讓 decorations 可在視覺上前後編排，但不得讓品牌入口、footer links 或 status badge 失去可點擊性。

替代方案是讓 decorations 自己接手互動。第一波沒有 editor/runtime 直接在 playback 中操作物件的需求，增加互動只會引入更多 hit-testing 風險。

### Fallback cleanly when no live decorations exist

若 live shell decoration config 為空、尚未設定、或引用素材無法解析，runtime SHALL 回到既有 shell chrome，而不是渲染破碎的 placeholder。這可確保 schema rollout 與 runtime rollout 之間不會讓 shell 進入半完成狀態。

替代方案是直接顯示錯誤佔位。這對管理面除錯有幫助，但對正式 playback 會造成視覺噪音；第一波應先以穩定呈現為主。

### Refresh active shells after shared shell publish

shared shell decoration live config 更新後，active playback 與 management shells SHALL 能在既有 sync 或 invalidation contract 下重新讀取 live shell decorations，而不是等整頁手動重整才生效。這能讓 shell decorations 真正成為可操作的 live chrome，而不是「發布成功但現場畫面不動」。

替代方案是要求使用者自行 reload。這會讓 shell authoring 的操作回饋很差，也容易被誤判為 publish 失敗。

## Implementation Contract

**Behavior**

- playback 與 management shells 會從同一份 live shell decoration contract 讀取 header/footer objects。
- header/footer 會在各自 band 內渲染 line、asset-image、ornament-image，並遵循 deterministic z-order。
- shell decorations 不會阻斷品牌入口、狀態 badge、weather 區塊、footer navigation 等既有互動元素。
- live config 為空、無法讀取或單一素材失效時，shell 仍維持既有 chrome，而不是整體 render failure。
- shared shell decoration publish 完成後，active shells 會透過既有 invalidation 或 refresh contract 重新取得 live shell config。

**Interface / data shape**

- web 端提供 shared shell decoration loader hook 或 loader helper，輸出至少包含 `headerObjects`、`footerObjects`、loading/fallback state。
- ShellDecorationLayer 以 mount-specific props 接收物件清單與 band geometry，並根據 object `type` 解析 line、asset-image、ornament-image render。
- AppHeader 與 AppFooterNav 維持原本的主要內容 props，不因 decorations 而改成 asset-driven header/footer。

**Failure modes**

- live config 讀取失敗時，runtime 回退為空 decoration layers，並保留既有 shell chrome。
- 單一 asset object 無法解析時，只略過該 object，不讓整個 header/footer render failure。
- 不合法的 object ordering 或 mount mismatch 不應在 runtime 修正；它們應由上游 schema validation 阻擋，因此 runtime 只處理 read fallback，而不重新發明驗證邏輯。
- 若 refresh event 遺失或 reload 失敗，shell 應暫時保留最後一份可用的 live shell decorations，而不是清空整個 header 或 footer layer。

**Acceptance criteria**

- web component tests 可驗證 playback 與 management shells 會渲染 shell decoration layers。
- component or hook tests 可驗證 empty config、missing asset、deterministic ordering 與 passive pointer-events 行為。
- `pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` 通過。
- `spectra validate --strict --changes render-shared-shell-decorations` 通過。

**Scope boundaries**

- In scope: runtime loader、header/footer decoration layers、mount-specific render、fallback、publish 後的 active shell refresh。
- Out of scope: editor authoring、page freeform objects、asset management page、文字物件。

## Risks / Trade-offs

- [風險] decorations layer 若層級放錯，可能蓋住 header/footer 互動元素。 → Mitigation：明確把 decoration layers 設為 passive，並用測試鎖住 pointer-events 與 stacking。
- [風險] runtime fallback 若做得過頭，可能掩蓋資料問題。 → Mitigation：對正式 shell 採 silent fallback，但保留 test coverage 驗證 empty/missing asset 路徑。
- [風險] management shell 與 playback shell 若各自微調 mount 幾何，可能導致共用物件位置不一致。 → Mitigation：兩者共用相同 band geometry constants 與 loader contract。
