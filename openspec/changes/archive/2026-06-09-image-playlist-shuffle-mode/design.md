## Context

Images 頁內輪播由 `useImagesAutoplay` 驅動，依 `getNextImagesAutoplayIndex` 以 display order 順序、依每個 entry 的 `durationSeconds` 循環切換。playlist 資料只有 entries（`image_playlist_entries`，由 `imagePlaylistService` 以 ensure-table 自建），沒有 playlist 級設定表，也沒有 shuffle 的 runtime 支援。

需求：提供可選的隨機（shuffle）播放順序，預設關閉、不影響現況；開啟時每輪仍覆蓋所有啟用 entry 一次，下一輪重洗。

現況事實（已查證）：
- `imagePlaylistService` 內以 `CREATE TABLE IF NOT EXISTS` 自建 `image_playlist_entries`，可沿用相同模式新增 settings 儲存。
- `useImagesAutoplay` 以 resolvedActiveIndex + 純函式 `getNextImagesAutoplayIndex` 前進，可在不改其計時架構下換成依「播放順序」前進。
- image-playlist route 既有 GET（讀 playlist）、PUT entry、PUT reorder；可延伸暴露 settings。
- web 透過 `services/api.ts` 呼叫 image-playlist API；ImageManagement 為管理面入口。

## Goals / Non-Goals

**Goals:**

- 新增 playlist 級 shuffle 設定（單一布林，預設 off），持久化且可由 API 讀寫、由 ImageManagement 切換。
- shuffle 開啟時，Images 內輪播以隨機順序覆蓋所有啟用且可播 entry 一次/輪，下一輪重洗；關閉時維持 display order。
- 排序由 shared 純函式計算（輸入 entries、shuffle 旗標、seed），在測試下可決定性驗證。

**Non-Goals:**

- 不做 Images 頁 rotation slot 覆蓋（另案）、不做 bulk 設定全部秒數（另案）。
- 不改每張秒數/順序 authoring、不改計時架構、不動其他頁、broker 韌性、過場。

## Decisions

**決策 1：以 ensure-table 模式新增 image_playlist_settings 單列表存 shuffle。**
- 在 `imagePlaylistService` 沿用既有 `CREATE TABLE IF NOT EXISTS` 模式新增單列設定表（欄位 shuffle INTEGER 0/1，預設 0），並提供讀/寫函式。
- 替代方案：將 shuffle 併入 playback settings 表。否決原因：playback settings 為顯示全域設定，shuffle 屬 Images playlist 專屬，併入會混淆語意。

**決策 2：shuffle 設定併入既有 playlist 讀取 payload，並新增 PUT 設定端點。**
- image-playlist GET 回傳值新增 settings.shuffle；新增 PUT /api/image-playlist/settings 更新 shuffle，沿用既有 route 的成功回應形狀並發出既有的 images-updated / display-sync 事件。
- 替代方案：完全獨立的 settings 資源。否決原因：與既有 playlist 讀取整合，client 一次取得即可。

**決策 3：shared 純函式計算播放順序。**
- 新增純函式（例如 `resolveImagesPlaybackOrder(entries, { shuffle, seed })`）：回傳啟用且可播 entry 的 entryId 順序；shuffle 為 false 時即 display order；為 true 時以 seed 決定的洗牌排列，且涵蓋每個啟用可播 entry 恰一次。
- `useImagesAutoplay` 改為沿此順序前進，並於完成一輪後以新 seed 重洗（shuffle 開啟時）。
- 替代方案：在 hook 內直接 Math.random 洗牌。否決原因：不可測；純函式 + seed 可決定性測試。

## Implementation Contract

**行為（Behavior）：**
- shuffle 預設 off；off 時 Images 內輪播順序 SHALL 維持現有 display order。
- shuffle on 時，每一輪 SHALL 涵蓋所有 enabled 且 playable entry 恰一次，順序隨機；下一輪 SHALL 以新 seed 重洗。
- shuffle 設定 SHALL 持久化，並於 image-playlist GET payload 中回傳；PUT 更新後 SHALL 發出既有的 images-updated 與 display-sync 事件。

**介面 / 資料形狀（Interface / data shape）：**
- image-playlist GET 回傳新增 settings 物件，含 shuffle 布林。
- 新增 PUT /api/image-playlist/settings，body 含 shuffle 布林，回應沿用既有 playlist 形狀（含更新後 settings）。
- shared 純函式：輸入 resolved entries、{ shuffle, seed }，輸出 entryId 陣列（啟用可播、每個恰一次）。

**失敗模式（Failure modes）：**
- PUT 缺漏或非布林 shuffle：維持現值、不丟未捕捉例外。
- 空（無啟用可播）playlist：排序函式回空陣列，autoplay 不前進，不產生錯誤。

**驗收（Acceptance criteria）：**
- shared 單元測試：shuffle=false 回 display order；shuffle=true 在固定 seed 下回確定排列且涵蓋每個啟用可播 entry 恰一次。
- server 測試（`apps/server/src/routes/image-playlist.test.ts`）：PUT settings 後 shuffle 持久化並出現在 GET payload；預設為 off。
- web 測試（`apps/web/src/hooks/useImagesAutoplay.test.ts`）：shuffle on 時 autoplay 依洗牌順序前進、一輪涵蓋所有啟用 entry；off 時維持 display order。
- `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 全綠、`pnpm run build` 通過。

**範圍邊界（Scope boundaries）：**
- In scope：settings 儲存與讀寫、API 暴露、shared 排序純函式、`useImagesAutoplay` 依序前進、ImageManagement toggle、相關測試。
- Out of scope：rotation slot 覆蓋、bulk duration、每張 authoring、計時架構、其他頁、韌性、過場。

## Risks / Trade-offs

- [洗牌品質/重複感] → 每輪重洗並保證一輪涵蓋全部一次，避免短期重複；seed 由執行期變動。
- [新增 settings 表的 migration 一致性] → 沿用既有 entries 的 ensure-table 自建模式，與現行 schema 管理一致；不引入新 migration 工具假設。
- [shuffle 與 rotation slot 覆蓋（另案）互動] → 兩者正交：slot 覆蓋決定整頁停留多久，shuffle 只決定內部順序；皆以「一輪涵蓋全部一次」為共同前提。

## Migration Plan

- 新增 settings 以 ensure-table 自建，無破壞性 schema 變更；預設 off 使既有行為不變。
- 回滾僅需移除 settings 讀寫與 hook 的 shuffle 分支。

## Open Questions

- shuffle 是否需要「避免連續兩輪開頭相同」等進階去重？（本 change 以「一輪涵蓋一次 + 每輪重洗」為足。）
