# Display 5 頁後台維護規畫

## 目標

為 5 個 display 頁面建立一組獨立於系統設定的後台維護能力，讓營運/設計維護者可在 management shell 內調整頁面版型、文案與資產，而不是直接改 `apps/web/src/pages/*/layout.ts`、`assets.ts` 與 CSS 常數。

## 範圍

納入以下 5 個 playback/display routes：

1. `/overview`
2. `/solar`
3. `/factory-circuit`
4. `/images`
5. `/sustainability`

## 階段

### Phase 1: IA 與路由切分
- [ ] 新增獨立 maintenance 區塊，不與 `settings/playback`、`settings/mqtt`、`settings/circuits` 混用語意。
- [ ] 新增統一入口，例如 `/display-pages` 或 `/settings/display-pages`。
- [ ] 定義 5 頁的 editor navigation 與 active page 切換模式。

### Phase 2: 設定模型與 API
- [ ] 設計 display page config schema：shared fields + page-specific fields。
- [ ] 定義 server 端 CRUD / read API 與儲存位置。
- [ ] 建立 seed/default config，從現有 hardcoded layout 與 asset map 匯入。

### Phase 3: 後台 editor UI
- [ ] 建立 shared editor shell：頁面清單、預覽、右側 inspector、儲存/還原。
- [ ] 先支援 overview/solar/sustainability 的 hero + KPI editor。
- [ ] 再支援 factory-circuit 的 nodes/connectors/load panel editor。
- [ ] 再支援 images 的 main media / info / thumb grid editor。

### Phase 4: Runtime 接線
- [ ] display pages 改為讀取 config，而非直接使用 layout 常數。
- [ ] 資產來源改為可從後台設定覆蓋，保留 fallback/default。
- [ ] 建立 live preview 或 preview route 更新機制。

### Phase 5: 驗證與治理
- [ ] 為 5 頁建立 config contract tests。
- [ ] 驗證 management route coverage 與導航完整性。
- [ ] 補文件：哪裡可調、哪些欄位是 shared、哪些欄位是 page-specific。

## 決策

- 獨立後台 SHALL 與 system settings 分開，避免混淆「系統行為設定」與「顯示頁內容/版型維護」。
- 第一版 SHOULD 採單一 editor entry + page tabs，而不是 5 條完全獨立 settings routes，以降低重複 UI 成本。
- Runtime page SHOULD 讀取 persisted config；`layout.ts` 只保留 default seed/fallback，不再是唯一真相來源。

## 風險

- `factory-circuit` 與 `images` 的 page-specific layout 差異大，若過度 generic 化，editor 會難用。
- 若直接把 CSS 細節全部暴露成欄位，後台會變成低價值的座標表單；需要控制第一版可調範圍。
- route/nav 若新增 display maintenance 入口，必須重新驗證 management footer/nav 覆蓋。
