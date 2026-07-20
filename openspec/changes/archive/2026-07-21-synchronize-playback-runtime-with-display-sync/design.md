## Context

目前 client 端 `usePageRotation()` 主要透過 `playback:settingsUpdated` 觸發 `controller.reload()`，但 server 真正會改變 effective rotation 的事件遠多於播放設定本身：display page publish、image asset 健康變化、MQTT readiness 變更、circuit slot 綁定更新都會經過 `display:sync`。server 端的 `readDisplayRotationPreview()` 已經會把這些條件折算成 playable pages、skip reason 與 fallback route，但前端 runtime 沒有把 `display:sync` 視為正式重算 trigger。

## Goals / Non-Goals

**Goals:**

- 讓 client playback runtime 在 relevant `display:sync` 後重新對齊 server rotation preview。
- 避免重複 sync 事件造成 runtime storm、route 閃跳或倒數重設失控。
- 讓 fallback route、playable pages 與 route rotation 決策維持同一份 server source of truth。

**Non-Goals:**

- 不改 server 端 `display:sync` event payload schema。
- 不重做 `DisplayRotationPreview` 的 server 評估規則。
- 不把 management preview surface 一併改成 live preview；那是另一個 change。

## Decisions

### Scope-aware display sync reload triggers

client 端不需要對所有 socket 事件都 reload playback runtime，但要把 `display:sync` 納入正式 trigger，並根據 `scope` 判斷是否影響 rotation。至少 `display-pages`、`images`、`mqtt`、`circuits` 都必須觸發 reload；其他 scope 若不影響 playable pages，則可以忽略。

替代方案是直接在所有 `display:sync` 都 reload，但那會讓與輪播無關的同步也打到 rotation runtime，造成不必要的重算。

### Runtime reconciliation after preview refresh

reload 後的新 runtime 不能只是全量重建然後硬切 route；它需要以最新 `DisplayRotationPreview` 為準，重新比對目前 route 是否仍 playable、目前 page 是否仍存在，以及 fallback route 是否改變。若目前 route 仍合法，應盡量保留當前 page 與進度；若已被 skip 或移除，才導向新的 playable route 或 fallback route。

替代方案是每次 reload 都從 start page 或 index 0 開始，但那會讓正常播放中的體驗產生不必要跳動。

### Debounced reload behavior

`display:sync` 可能在短時間內連續出現，例如同一次 publish 伴隨 asset health、readiness 或 image updates。client 端需要 coalesce 近距離事件，只做一次 reload，並確保 pending reload 完成前不再重入。

替代方案是讓每個事件都直接呼叫 `loadPlayback()`；這雖然簡單，但在真實操作下會造成多次 network round-trip 與重複 runtime reconciliation。

## Implementation Contract

- Behavior:
  - 當 client 端收到與 rotation 相關的 `display:sync` scope 時，playback runtime SHALL 重新讀取 server rotation preview 並更新 playable pages、fallback route 與 route rotation 決策。
  - 若目前 route 在新 preview 下仍 playable，runtime SHOULD 保留現有 route 與可相容的倒數進度；若 route 不再 playable，runtime SHALL 切換到新的 playable route 或 fallback route。
  - 多個短時間內的 relevant sync 事件 SHALL 被合併，避免重複重建 runtime。
- Interface / data shape:
  - client 端需要一個 scope filter / debounce helper，供 `usePageRotation()` 或 `usePlaybackController()` 訂閱 `display:sync` 使用。
  - reload 後仍以 `getDisplayRotationPreview()` 與 `getPlaybackSettings()` 作為 authoritative data source。
- Failure modes:
  - 若 reload 失敗，client SHALL 保留上一個可用 runtime，並顯示既有 error state，而不是清空 pages。
  - 若 preview 回傳沒有 playable pages，client SHALL 使用 server 提供的 fallback route。
- Acceptance criteria:
  - 新增 hook/unit tests 覆蓋 relevant scope 觸發 reload、irrelevant scope 不觸發、burst sync 只 reload 一次、current route 被 skip 時改走 fallback。
  - `pnpm exec spectra analyze synchronize-playback-runtime-with-display-sync` 與 `pnpm exec spectra validate --strict --changes synchronize-playback-runtime-with-display-sync` 通過。
- Scope boundaries:
  - In scope: client playback runtime reload triggers、runtime reconciliation、debounce。
  - Out of scope: live preview UI、server rotation business rules、management dirty-draft protection。

## Risks / Trade-offs

- [Risk] scope 判斷過度保守，導致部分 relevant sync 沒有觸發 reload → Mitigation: 以目前 server 已知會影響 rotation 的 scope 白名單起步，並由測試鎖定。
- [Risk] progress reconciliation 太複雜造成 hidden bug → Mitigation: 只在 current route 仍存在且相容時保留進度，其餘情況明確重置。
- [Risk] debounce 太長導致 operator 認為輪播沒有即時更新 → Mitigation: debounce window 保持短且可測，優先追求單次操作只重載一次。
