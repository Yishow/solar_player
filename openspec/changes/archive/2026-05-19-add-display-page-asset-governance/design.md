## Context

展示頁目前以 `src` 與 `alt` 直存素材欄位，頁面與 editor 無法知道素材是否存在、目前是不是被其他展示頁共用、該如何裁切與對齊，也無法把同一素材的 draft and live 差異說清楚。既有 `ImageManagement` 能管理圖片檔案，但還不是展示頁資產治理模型。

## Goals / Non-Goals

**Goals:**

- 建立展示頁共用的 asset reference 與引用關係模型。
- 補齊 media placement controls，使素材能在不同頁面版位穩定裁切與對齊。
- 提供 asset health reporting，讓管理端可發現缺圖、停用素材與不健康引用。

**Non-Goals:**

- 不在此 change 內實作圖片播放清單排序與 slide metadata。
- 不在此 change 內實作 device-status 的完整資產診斷頁。
- 不在此 change 內處理 display page publish lifecycle 本身。

## Decisions

### Use managed asset references instead of raw src strings

展示頁配置改存 `assetId` 或等價受管理引用，而不是裸 `src`。runtime 需要時再解析成可播資產 URL 與 metadata。這樣同一素材的狀態、刪除保護與引用追蹤才能共用。

### Store media placement controls beside each media binding

focal point、fit mode、alignment 與 safe crop zone 跟著每個 media binding 走，而不是做成全局預設。不同頁面 hero 與 images stage 對同一素材的裁切需求可能不同，因此要容許 page-local placement。

### Compute asset health reporting from references and repository state

asset health reporting 由 server 根據引用關係、素材存在性與尺寸資訊動態計算，web 只負責呈現。這讓 editor、image management 與後續 status surface 看見的是同一份健康結果。

## Implementation Contract

- Behavior:
  - editor 與 runtime 可使用受管理素材引用，而非直接寫死字串 URL。
  - 維運人員可在 editor 挑選素材、看到素材健康狀態，並設定 focal point、fit mode 與對齊方式。
  - 若素材不存在或不健康，管理端會收到警示；runtime 依既有 fallback 或替代資產顯示。
- Interface / data shape:
  - display page media fields 需支援 `assetId`, `alt`, `fitMode`, `focusX`, `focusY`, `alignX`, `alignY` 或等價欄位。
  - server 提供展示頁素材查詢與資產健康回應，回應至少包含引用頁面、健康狀態、原因與建議。
- Failure modes:
  - 指向不存在資產時不應讓 runtime 崩潰，需回退到 fallback。
  - placement controls 無效時 server 回傳 validation 錯誤或退回安全預設。
- Acceptance criteria:
  - server tests 覆蓋素材引用解析、健康報告與不存在素材處理。
  - web tests 或手動驗證覆蓋 editor asset picker、placement controls 與 runtime 顯示結果。
- Scope boundaries:
  - in scope: managed asset reference、placement controls、health reporting。
  - out of scope: slide playlist、rotation 規則、publish lifecycle。

## Risks / Trade-offs

- [Risk] 既有頁面同時存在裸 `src` 與新引用模型造成遷移複雜 → Mitigation: 提供兼容讀取與明確 migration path。
- [Risk] placement 欄位過多使 editor 複雜化 → Mitigation: 先限制在 focal point、fit mode、alignment 四類高價值控制。
- [Risk] asset health 計算成本上升 → Mitigation: 以查詢時計算為主，必要時再加快取。
