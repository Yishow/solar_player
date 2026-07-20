## Context

一旦 `/images` 播放頁改吃 `/api/image-playlist`，`/settings/images` 若仍只管理 asset-level 欄位，就會出現「畫面能播，但營運端無法完整控制播放資料」的落差。目前 repo 已有 image playlist service、entry update 與 reference summary，只是管理頁還沒有把這些 runtime 治理語意完整露出來。

這個 change 的目的不是再做一個大型 playlist editor，而是把現有 image management 補成 MVP 可治理入口：操作員至少要能看到播放層 metadata、duration、fallback 與使用風險。

## Goals / Non-Goals

**Goals**

- 在 `/settings/images` 區分 asset-level 欄位與 playlist-level 欄位。
- 讓操作員能查看並更新影響 `/images` 播放的 playlist-facing metadata。
- 在刪除或替換圖片前，明確檢查 live display reference 與 playlist usage。
- 補齊 UI adapter、API client 與 targeted tests。

**Non-Goals**

- 不建立全新的多頁籤 playlist studio。
- 不改寫圖片上傳、storage 或 asset library 基礎流程。
- 不把播放 runtime change 和管理治理 change 合成一包。

## Decisions

### Extend the existing Image Management page instead of creating a second playlist screen

決策：沿用 `/settings/images`，在既有選取資產編輯面板上補齊 playlist-facing 欄位與 usage 資訊，而不是另開大型 playlist 專頁。

理由：這輪是 MVP gate，重點是讓現有管理頁足以治理播放，不是再擴出第二套資訊架構。

### Separate asset semantics from playlist semantics

決策：檔案本身的 title/description/cover 等 asset-level 狀態，與播放順序、duration、fallback、enabled 等 playlist-level 狀態，在 UI 與資料更新路徑上要分清楚。

理由：這是避免管理頁後續難維護的最小必要邊界。

### Block destructive actions when live or playlist usage still exists

決策：刪除或替換圖片前，管理頁必須顯示 live display references 與 playlist usage blocker。

理由：一張圖是否能刪，已不只是 asset library 問題，而是播放面是否還依賴它。

## Implementation Contract

1. `/settings/images` SHALL 顯示並更新會影響 `/images` 播放的 playlist-facing metadata，例如 display order、duration、enabled 與 fallback mode。
2. asset-level 欄位與 playlist-level 欄位 MUST 在 UI 與更新流程中被清楚區分。
3. 當圖片仍有 live display reference 或 playlist usage 時，刪除或替換動作 MUST 顯示 blocker 或明確風險提示。
4. 既有 asset upload、cover 設定與 library list MUST 保持可用，不因 playlist 治理補線而退化。
5. targeted tests SHALL 覆蓋 playlist metadata 更新、usage blocker、delete guard 與 success feedback 情境。

## Risks / Trade-offs

- 若 asset 與 playlist 欄位仍混在一起，後續每次改播放邏輯都會牽動整個管理頁。
- 若 delete guard 只看 liveCount 不看 playlist usage，操作員仍可能刪掉正在輪播的 entry。
- 若這頁 scope 擴得太大，很容易再變成一個大型 change；因此必須限制在現有頁面補線。
