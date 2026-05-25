## Context

目前 playback shell 的 header/footer 裝飾主要存在於 AppHeader、AppFooterNav 與 global.css 的固定實作中。這個模式能維持單一視覺基線，但無法讓 operator 以物件方式管理線條、上傳裝飾圖與 shell ornaments，也無法與後續 page-level 自由物件共用資料模型。

現有 display page config 已具備 draft/live channel、asset binding 與 layout safety guard，代表新的 shell decoration 契約若要可長期維護，必須同樣具備：
- 穩定的 shared schema export
- draft/live envelope 與 deterministic seed
- publish 前 validation
- public-safe read contract

這個 change 是後續 shell runtime render、shell editor、page freeform objects 與 asset library management 的地基，因此需要先把資料模型和驗證邊界獨立出來。

## Goals / Non-Goals

**Goals:**

- 定義全站共用 header/footer decoration envelope，而不是把裝飾塞回單頁 page config。
- 定義第一波 shell objects 的共用 base shape，供 shell 與後續 page objects 重用。
- 明確規範可接受的 shell object types、geometry、source payload 與 z-order 形狀。
- 建立 draft/live 儲存、default seed、validation 與 public-safe read contract。

**Non-Goals:**

- 不在這個 change 內渲染 shell decorations 到 AppHeader 或 AppFooterNav。
- 不在這個 change 內新增 editor UI、region tree、layer buttons 或 asset picker。
- 不在這個 change 內新增 page-level freeform objects。
- 不在這個 change 內處理文字物件、混合模式、遮罩或進階動畫。

## Decisions

### Keep shell decorations in a dedicated shared envelope

shell decorations SHALL 存在獨立的 shared shell configuration envelope，而不是掛在任一 display page config 底下。理由是 header/footer 為全站共用 shell surface，若把資料寄生在某一頁會造成 ownership 混亂，且無法合理表達「全站共用，但與單頁 draft/publish 分離」的需求。

替代方案是把 shell decorations 放進 brand profile 或任一 page config。前者會把品牌素材與幾何/物件編排混在一起；後者會讓全站 shell 行為依附單頁生命週期，兩者都會讓後續 authoring 與 sync 範圍難以維護。

### Reuse one base display object shape across shell and future page objects

第一波雖然只做 shell objects，但 object schema SHALL 從一開始就抽出共用 base shape：id、type、mount、frame、visible、locked、zIndex、source、style、metadata。shell 與 page objects 後續可在這個 base shape 上擴充 mount-specific rules，而不是各自定義兩份不相容 payload。

替代方案是先只做 shell 專用 shape，等 page objects 再重做。這會讓 asset references、layer controls、validation 與 editor overlays 在第二波重新對齊一次，重工成本高。

### Validate shell objects against header/footer bands before publish

shell decoration envelope 的 publish validation SHALL 以固定 band geometry 驗證 mount=header 或 mount=footer 的物件 frame，不允許跨 band 漂移。line、asset-image、ornament-image 的 source payload 也 SHALL 在 publish 前被檢查，避免 runtime 才發現 mount 錯誤或 asset reference 無效。

替代方案是完全信任 editor 並在 runtime 靜默容錯。這會讓壞資料進 live channel，進而在 playback shell 產生不可預測的重疊或消失。

### Expose deterministic default seed and public-safe read contract

系統 SHALL 提供 deterministic 的 default seed 與 public-safe read contract，讓 runtime 在沒有 live config 時仍有穩定空 payload，而 editor 也能從同一個入口取得 draft/live envelope。public-safe read contract 不應暴露 draft metadata 或管理面專用欄位，避免 playback shell 讀取到不必要的 authoring 細節。

替代方案是讓每個 consumer 自己 fallback。這會把空狀態與版本相容邏輯散落在 runtime、editor、management UI，之後更難演進。

## Implementation Contract

**Behavior**

- 系統提供一份全站共用 shell decoration envelope，獨立於任一 display page config。
- envelope 至少包含 draft 與 live 兩個 channel，且每個 channel 可分別持有 headerObjects 與 footerObjects。
- 第一波 shell objects 支援 line、asset-image、ornament-image 三種類型，並共享同一個 base object shape。
- publish 前會阻擋超出 band、type 不支援、source payload 無效或 object ordering 不合法的資料。
- runtime/editor 若尚未有 live/draft config，仍能取得 deterministic 空 seed，而不是 `null` 或 consumer-specific fallback。

**Interface / data shape**

- shared package 匯出 shell decoration envelope types、base display object types、supported shell object unions、default seed builder 與 validation helpers。
- server 端提供管理面可寫的 draft/live API，以及 playback/runtime 可讀的 public-safe shell decoration read API。
- web 端提供 typed service，供後續 shell renderer、editor 與 asset library picker 共用。
- object payload 至少包含：id、type、mount、frame、visible、locked、zIndex、source、style、metadata；其中 mount 僅接受 `header` 或 `footer`。

**Failure modes**

- invalid mount、band overflow、unsupported object type、malformed source payload、duplicate id 或 unstable ordering SHALL 以 validation finding surfaced，並阻擋 publish。
- read API 若尚未有 persisted config， SHALL 回傳 default seed；若 persisted payload 已損壞， SHALL 回傳可診斷的管理面錯誤，而非讓 playback shell讀取半殘資料。

**Acceptance criteria**

- shared contract tests 可驗證 default seed、union narrowing 與 validation helpers。
- server route/service tests 可驗證 draft/live 儲存、public-safe read、publish rejection 與 deterministic ordering。
- `pnpm --filter @solar-display/shared build` 與 `pnpm --filter @solar-display/server test` 通過。
- `spectra validate --strict --changes add-shared-shell-decoration-schema` 通過。

**Scope boundaries**

- In scope: schema、draft/live envelope、validation、default seed、shared/web/server read contract。
- Out of scope: runtime render、editor UI、asset 管理頁、page-level objects、文字物件。

## Risks / Trade-offs

- [風險] shell-only schema 若先做太窄，後續 page objects 仍可能需要破壞式擴充。 → Mitigation：base object shape 先抽成 shared union，mount-specific rules 只放在 shell validation。
- [風險] 新增獨立 shell configuration 會增加一組 draft/live persistence。 → Mitigation：沿用既有 display publishing envelope 與 validation patterns，避免自創第二套 lifecycle。
- [風險] asset references 若一開始與現有 media binding contract 不相容，後續 asset library 會出現雙軌來源。 → Mitigation：source payload 命名與 resolver 先對齊既有 managed asset reference 思路。
