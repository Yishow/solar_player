## Context

目前系統實際有兩套 page identity：

1. 前端與 shared contract 用 `overview`、`solar`、`factory-circuit`、`images`、`sustainability` 這五個 `DisplayPageKey` 當 runtime 真相。
2. 後端資料表 `playback_pages` 只是在這五頁外層包一層排序與秒數設定。

這代表資料表看似可擴充，實際上 route、editor、config publish、rotation 與 runtime refresh registry 都只接受五個 page keys。新增頁面現在不是缺 UI，而是整個 contract 沒有「頁面實例」層。

## Goals / Non-Goals

**Goals**

- 建立可持久化的 display page registry，讓播放頁面以 page instance 而非硬寫死 template key 運作。
- 允許新增、封存、重新命名與調整 route slug，但仍限制在受支援的 template kinds 內。
- 讓 playback、editor、preview、publish 與 route meta 都從同一份 registry 讀取頁面集合。

**Non-Goals**

- 不做 arbitrary custom React page injection。
- 不在這個 change 重新設計 editor schema。
- 不處理 shell 分流與管理頁版面，那是另一個 change。

## Decisions

### Separate template kind from page instance

決策：新增 `DisplayPageTemplateKey` 表示內建模板種類；`DisplayPageInstance` 表示可播放、可編輯、可封存的頁面實例。

理由：目前最大問題不是五種模板不夠，而是五種模板直接等於五個唯一實例。分層後才能支援「第二張 Images 頁」或「不同副本共用同模板」這類需求。

### Keep supported templates finite

決策：registry 只允許引用白名單模板種類，例如 `overview`、`solar`、`factory-circuit`、`images`、`sustainability`。

理由：這輪是把模型從硬編碼改為 registry，不是開放任意 page code execution。

### Resolve routing from registry, not from static route arrays

決策：playback routes 改為動態 route host，根據 registry 解析目前 route 對應哪個 page instance，再映射到 template renderer。

理由：只要 router 仍手動列出五個 React routes，新增 page instance 永遠不可能真的被播放或編輯。

## Implementation Contract

1. 系統 SHALL 提供 display page registry API，能讀取、建立、更新、封存 page instances。
2. page instance MUST 包含穩定識別碼、template kind、route slug、顯示名稱、排序、啟用狀態與 stage/publish 關聯。
3. playback rotation、Display Pages Editor tabs 與 management preview MUST 從 registry 決定有哪些頁面，而不是直接讀寫 `displayPageKeys` 常數。
4. 既有五頁 MUST 在 migration/seed 後以 registry instances 形式存在，避免升級後遺失現有設定。
5. 系統 MUST 拒絕重複 route slug、未知 template kind 與刪除唯一 remaining required seed page 的非法操作。

## Risks / Trade-offs

- Router 從靜態改為 registry host 後，測試與 preload 路徑會變複雜。
- 若 template kind 與 config schema 邊界沒切乾淨，editor 會把 instance 層與 template 層責任混在一起。
- 若 migration 只補新表、不處理舊 `playback_pages` 對應，升級後很容易出現 rotation 與 publish stage 脫節。
