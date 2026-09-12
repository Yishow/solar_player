## Context

UI 已有 route lazy loading、workspace staging、memo、圖片 lazy/async 與 opt-in displayEditorProfiler。仍可從程式碼確認三個成本：工作區 loader 串行等待非必要資料、拖曳 feedback 重建靜態 overlay、AssetLibrary 每次 parent render 產生不同 callback props。目前未量測時間或掉幀，必須先留下可比較基線。

本案依賴 fix-ui-draft-and-interaction-consistency 完成工程驗證並提供修正後 witness。兩案會修改 DisplayPagesEditor/index.tsx，因此串行 apply。本案不改後端、資料版本、權限、API 或套件依賴，也不把功能缺陷修正冒充效能收益。

## Goals / Non-Goals

**Goals:**
- 工作區入口先呈現管理 frame 與明確 pending/error，再由工作區自己的資料決定可用內容；已取得的內容不等待 asset health。
- 在保持拖曳最終 geometry、吸附與 undo 契約下，減少整份 overlay 準備與 React feedback 更新。
- 讓 AssetLibraryCard 的 memo 對選取互動生效，並以相同 fixture 證明減少工作量。
- 產生可重現、保留原始樣本與視覺/行為核對的效能證據。

**Non-Goals:**
- 不做管理頁 RWD、FHD 視覺改版、清單虛擬化、全域 state/store 重構、所有 inspector keystroke 的增量 cache、Web Worker 或後端查詢調校。
- 不承諾尚未量測的毫秒或加速百分比，不把本機 browser 結果宣稱為 Pi 或 production acceptance。
- 不重寫既有 route chunk recovery、cache generation、draft concurrency、source scope 或 unlock gate。

## Decisions

### 工作區資料載入分流

以 workspaceLoadPlan 純函式將 URL/return context 對應 editor、assets、shell 所需資源，再調整 loadDisplayPagesEditorRoute 與 runtime component 的啟動順序。editor 需要 page registry 與已選頁 draft；assets 需要 image model，health 獨立；shell 需要 shell decoration draft。跨工作區回傳所需的既有 draft session 必須保留，但 assets/shell 冷啟動不得等待不相關的 page draft 才呈現內容。

資料生命週期固定由 mounted workspace 元件擁有：loadDisplayPagesEditorRoute 只解析 URL/輕量入口資料並立即返回，不 await 或另啟動 registry/draft/image/health/shell 讀取。DisplayPagesEditorRoute 先渲染 ManagementShellFrame，再由 frame children 內的 workspace data host 掛載既有 hooks/clients；registry 與 draft 僅 editor/明確 return context 需要，assets 與 shell 由各自工作區啟動。resource state 使用 pending/ready/error 並各持有 retry；既有 read cache 是快取，不是第二個 pending/error owner。健康資料不得藏在 loader 的吞錯 catch 中；其失敗由 asset workspace 顯示並單獨重試，不重載頁面或 draft。

保留目前 API client/cache 去重與 preload 功能。避免引入第二套通用 query/cache framework；它會增加 invalidation 與 draft ownership 的風險。延後的 draft 仍遵守先有 authoritative baseline 才可編輯；warm draft 不因 workspace 切換被重置。

### 管理路由等待與錯誤呈現

由 ManagementRouteState 提供共用 pending 與可重試 error 內容，接入 editor route 的初始 fallback/error boundary 及 ManagementShell 的 navigation pending 指示。cold lazy-code pending 由 router 的 hydrate fallback 顯示不含管理資料的 ManagementRouteState；lazy-code/入口失敗由 route error boundary 顯示重試，資源請求失敗不丟到會卸載 dirty workspace 的 route boundary。ManagementShellFrame 維持既有 useManagementPasswordGate/ManagementUnlockScreen，hidden-route wrapper、requestJson 管理拒絕處理與伺服器授權照舊。已知 requiresUnlock 時不掛載 workspace data host，fallback 不啟動 registry/draft/images/health/shell 請求；管理 auth-state/unlock 與既有 shell bootstrap 依原政策運作。本案不重設未知 auth state 的預設政策，也不新增 credential/token 路徑。已有畫面的換頁保留內容並標示等待；錯誤重試只重試失敗資料，不隱含捨棄 dirty draft。

不以全頁無內容 spinner 替代可用畫面，也不提前渲染受限內容。這是新增 pending/error 狀態；成功狀態沿用既有 shared components/classes 與固定管理 canvas。既有 management lazy bundle 邊界及 chunk recovery 維持。

### 拖曳靜態資料重用與動畫幀合併

新增 canvasOverlaySession 封裝 session generation、static frame/page-guide preparation 與可取消的 animation callback。canvasOverlayState 將穩定資料準備與活動 region 的 feedback 組合分離；inspectorFields 使用一次建立的 frame id lookup，避免逐 region 線性搜尋。只在 config/regions、選取/鎖定、overlay preset、viewport 等實際輸入改變時失效，不快取依活動 rect 改變的 guides、selection bounds 或 measurements。

每個 pointermove 仍計算並保存最新合法 rect 到 ref；React feedback 每個 animation callback 最多發布一次。pointerup 即使發生在 callback 前，也提交最後已依既有事件解算規則得到的 rect 一次，使用既有 historyBase；清除排程後不得有遲到 feedback。lock、工作區/page 切換及 unmount 取消 session 排程，維持既有終止規則，不新增 pointercancel commit 語意。

落點比對使用相同完整事件序列與前案修正後基線。現行 handlePointerUp 不另以 release event 的 clientX/clientY 重算；本案保留此取樣政策，另補最後 pointermove 與 pointerup 座標不同的 before/after 差分 case。主規格的相同 pointer path/endpoint 結果等價要求仍有效；新增 pointerup sampling 屬另一行為修正，不在純效能案暗中引入。

相較全面 throttle pointermove，這個邊界保留每次輸入的約束與最終座標。相較全域 geometry cache，session cache 較容易驗證失效條件。

### 素材卡片 props 穩定化

抽出現有 AssetLibraryCard，以 asset id 傳給穩定的 select/batch/delete handlers，父層使用正確 dependencies 取得最新資料。不得用忽略 callbacks 的自訂 memo comparator 隱藏 stale closure。圖像 lazy/async、排序、篩選、batch limits、reference/delete guard、素材套用與回傳保持原契約。

對 props 不變的卡片，在選取互動時不重新 render；只有選取狀態改變的卡片更新。先以 render count 證明此邊界，不引入虛擬化或 CSS rendering isolation，避免改變 scrolling、focus 與 FHD 證據。

### 可重現效能證據

延伸既有 opt-in profiler 與 browser smoke；測試以 ui-performance 標籤執行，使用隔離 runtime 的 read-response fixtures，不操作正式資料。報告記錄 source revision/worktree diff 身分、lockfile hash、browser/hardware、build mode、fixture hash、cold/warm cache 狀態、原始樣本與中位數。基線必須是前案修正後版本；before/after 各五次同條件執行，不能比較不同資料或只挑最快一次。

固定素材 fixture 參數為 100/1000 張；overlay mounted/fake-RAF fixture 使用 100 個合成 region，browser editor 使用現有合法 template 並記錄實際 region 數，不擴充 production schema 以湊數。拖曳單元 fixture 使用 100 次 pointermove、10 次受控 animation callbacks 及一次 pointerup。這些是驗收輸入，不是既有實測結果。確定性門檻為單次 session 未失效時 static preparation 一次、每 callback 最多一次 feedback、主 config/undo 一次；單選 A 改 B 最多兩張 card render，單一 batch toggle 最多一張，其餘 props 不變。

時間量測包含 route navigation 到 frame 可見/內容可用、drag overlay duration 與 asset selection commit duration，另記 request/render/preparation counts。至少在本案三個目標各證明消除指定等待或工作量；時間無改善或退步照實回報並分析，不以 instrumentation 或抽檔本身當作改善證據。實作只在 opt-in 記錄，關閉時不新增 DOM、console 或長期累積 entries。

## Implementation Contract

- Behavior: assets/shell 不等待不相關 page draft；asset health 失敗只顯示診斷錯誤，不隱藏已可用素材。editor 冷草稿保持唯讀 gate；warm session 往返、deep link、retry 與 unlock 行為不變。cold draft gate 直接使用前案 Draft editing requires an authoritative initial baseline 的 hook/UI 介面與 regression，不另造 readiness 定義。拖曳提交最後事件的合法 rect，卡片選取只更新受影響卡片。
- Interface/data: workspaceLoadPlan 輸入解析後的 workspace 與既有 return context，輸出必要/延後資源集合；canvasOverlaySession 保存 generation、static frames lookup、pending feedback 與 cancel/flush lifecycle，不持有或寫入後端 draft。AssetLibraryCard callbacks 以 asset id 表達意圖，再由 parent 查最新 asset/reference 狀態。
- Report: tests/browser/ui-performance.spec.ts 透過 Playwright attachment 保存 JSON，包含 environment、fixture、baseline/candidate identities、raw runs、summaries、operation counts、output-equivalence results 與 limitations。以 BROWSER_SMOKE_KEEP_SUCCESS_ARTIFACTS=1 BROWSER_SMOKE_GREP=ui-performance pnpm run browser:smoke 保留 artifacts/browser-smoke 下證據；不提交執行產物或另建正式資料庫。
- Failures: deferred health/page/shell request 各自可重試；舊 owner/generation 回應不得回填新工作區。callback 取消、locked region 或 unmount 後不得寫入已結束 session。性能 fixture 缺資料、baseline 不同或輸出不等價時量測判為不可比較，不能報 PASS。
- Acceptance: spec scenarios 對應 mounted/fake-RAF/browser tests；保持既有 drag commit/history、active-surface recompute、staged loading、render invariance 與 route budget checks。最後版本 pnpm verify、spectra analyze/validate，並按 FHD 流程附 fresh witness/gap/evidence；正式裝置與人員 acceptance 分開記錄。
- Scope: 只修改 proposal Impact 列出的 loading、overlay、card、profiler 責任及相應 tests；新增檔案限上述 helper/component/test 與其直接測試。若 baseline 顯示需全域 config selector 或虛擬化才有收益，記錄後續建議，不在此案擴張。

## Risks / Trade-offs

- [Deferred loading 暴露原先隱藏的中間狀態] → 對 pending/error/access/dirty return 建立 mounted tests，成功內容保持既有 DOM/classes。
- [Overlay cache 遺漏 invalidation 或 late rAF] → 以輸入 fingerprint/generation、fake-RAF endpoint/cancel tests 與原 geometry 結果差分驗證；不用時間型 TTL。
- [Callback 穩定化造成 stale delete/reference] → 在 callback identity 穩定時更換 asset/reference fixture，驗證處理使用最新資料與既有 guard。
- [1000 cards 仍有首次 mount 成本] → 報告分開呈現首次載入與選取收益，不把本案說成大型清單全解。
- [時間噪音或非代表性硬體] → 保留五次原始樣本及環境；確定性操作門檻先判定，Pi/FHD/production 品質另有 witness 與人工 acceptance。
