## Context

`Playback Settings` 與 `Slideshow Preview` 都需要向操作員顯示「目前會播什麼」，但現在兩者仍依賴靜態 JPG 或固定 asset map。另一方面，正式 display pages 已經改成由 live stage config、media binding、icon source 與 page-specific runtime 組裝。這表示管理頁看到的縮圖不是正式播放的單一來源，也無法反映 editor 已發布的版面變更。

## Goals / Non-Goals

**Goals:**

- 讓管理頁 preview surface 直接反映正式 `live` display page contract。
- 讓 preview 在 live config、asset 或 runtime source 無法解析時，有明確可辨識的 fallback state。
- 維持 preview surface 的唯讀性，不把 `Playback Settings` 或 `Slideshow Preview` 變成另一個 editor。

**Non-Goals:**

- 不改 `Display Pages Editor` 的互動。
- 不處理播放 runtime reload trigger；那是另一個 change。
- 不要求 preview surface 在 management route 顯示完整 1:1 動態播放，只要求來源一致與狀態可辨識。

## Decisions

### Shared live preview renderer

建立共用的 live preview renderer，讓 `Playback Settings` 與 `Slideshow Preview` 都能以相同方式渲染任一 display page 的縮圖。renderer 需要知道 page key、live config、對應 page preview component，以及必要的 runtime payload bootstrap 規則。這比兩個管理頁各自組 preview 更能維持 parity。

替代方案是由 server 產圖並回傳 snapshot URL，但目前 repo 已經有 page-level React renderer，可直接重用；先走 client renderer 較快且較少基礎設施。

### Live stage preview data source

preview surface 的 primary source 改為正式 `live` stage config，而不是草稿或靜態示意圖。這樣操作員在 editor publish 後，preview 會反映正式生效版本，而不是未發布草稿或手工維護的靜態圖片。

替代方案是繼續保留本地 JPG 當主要來源、只在某些頁 fallback 到 live config，但那無法真正消除 drift。

### Preview fallback semantics

當 preview renderer 無法取得 live config、必要 asset 或 runtime payload 時，surface 必須顯示明確 placeholder / stale 狀態，並指出這是 preview fallback，而不是把舊靜態圖當成真實畫面。這讓操作員能分辨「正式頁未發布」、「素材缺失」與「預覽本身失敗」三種情況。

替代方案是靜默保留舊圖，但這會再次把 drift 隱藏起來，失去這個 change 的核心價值。

## Implementation Contract

- Behavior:
  - `Playback Settings` 與 `Slideshow Preview` SHALL use live display page preview surfaces derived from the current published display page contract rather than static illustrations.
  - 當某頁 live config 已發布且可解析時，preview SHALL 反映該頁最新的 published layout / media / icon 狀態。
  - 當 preview 無法解析時，surface SHALL 顯示明確的 preview fallback / placeholder state，而不是回退成過期靜態圖。
- Interface / data shape:
  - 需要共用 preview renderer API，至少接收 page key、preview size、是否允許 runtime bootstrap、fallback metadata。
  - 需要一個 preview hook 或 helper 從 `live` stage config 與 page renderer 組裝 preview props。
- Failure modes:
  - 若 live config 載入失敗，preview SHALL 顯示 config-unavailable state。
  - 若 runtime payload 載入失敗但 config 仍可用，preview MAY 顯示 config-only placeholder，但 MUST 標示其為 preview fallback。
- Acceptance criteria:
  - `Playback Settings` 與 `Slideshow Preview` 的預覽不再依賴固定 JPG 作為 primary source。
  - 發布 display page 後，preview surface 能反映更新內容。
  - `pnpm exec spectra analyze replace-static-previews-with-live-display-page-previews` 與 `pnpm exec spectra validate --strict --changes replace-static-previews-with-live-display-page-previews` 通過。
- Scope boundaries:
  - In scope: live preview renderer、management preview fallback states、published preview parity。
  - Out of scope: editor interactions、server-side screenshot pipeline、rotation runtime trigger logic。

## Risks / Trade-offs

- [Risk] preview renderer 重用 page component 時帶入過多 runtime 成本 → Mitigation: 定義 lightweight preview mode，必要時允許 config-only rendering。
- [Risk] management route 的 layout 與 preview container 比例不同，導致縮圖顯示異常 → Mitigation: 共用 preview component 明確定義 viewport / scale contract。
- [Risk] 完全刪除靜態 JPG 後，某些無法 bootstrap 的頁面沒有退路 → Mitigation: 保留 explicit placeholder state 作為 fallback，而不是保留過期靜態圖作為主要來源。
