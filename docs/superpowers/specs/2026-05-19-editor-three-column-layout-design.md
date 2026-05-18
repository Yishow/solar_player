# Display Pages Editor — 三欄式佈局重設計

**日期：** 2026-05-19
**狀態：** 已定稿，待實作

## 問題背景

目前 `/display-pages/editor` 頁面採用兩欄佈局（左 sidebar 320px + 右側彈性），所有面板隨頁面一起捲動。操作路徑為：捲左↓ 點 Region Tree → 捲右↑ 看 Canvas → 捲右↓ 看 Inspector，需要三次捲動切換，使用體驗不連貫。

## 設計決策

採用**三欄式 Figma 風格佈局**：

- Region Tree（左欄）、Canvas（中欄）、Inspector（右欄）同時可見
- 整個 editor 鎖定 viewport 高度，外層頁面不捲動
- 各欄獨立捲動

## Header 變更

**Page tabs 移至 TitleBlock aside（右下對齊）**

- `DisplayPagesEditor` 改用 `PageContainer` 直接（繞過 `PageScaffold`），取得 `aside` prop 控制權
- `density="playback"` → `PageContainer` 以 `h-full` 渲染，啟動 viewport-locked 模式
- `aside` 傳入 page tab bar 元件（水平排列，`self-end` 底部對齊）
- **移除** `PageNumberPill`
- Page tabs 樣式沿用目前 sidebar 的 active / inactive 設計，改為 horizontal pill 形式

## 三欄佈局

### 左欄 — Region Tree（220px 固定）

**內容（上→下）：**
- 欄標題 "Region Tree"（小 uppercase label）
- Region 列表，各 region 可點選 / 顯示鎖定狀態（`overflow-y-auto`，獨立捲動）
- **底部固定（flex footer）：**
  - 狀態訊息列（dirty / error / saved）
  - 三個按鈕：重新同步 / 儲存設定 / 發布草稿

**移除：** 目前 sidebar 內的頁面切換按鈕、Publishing Panels（移至右欄）

### 中欄 — Canvas（`1fr` 彈性）

**內容：**
- Canvas / Preview 畫面（填滿中欄）
- 底部 viewport 工具列（縮小 / 放大 / 重設 / 適合視窗 / edit mode badge）

**不動：** Edit mode 工具列保持現狀，不做任何調整

**元件拆分：** `DisplayEditorCanvasCard` 從 `cards.tsx` 獨立為 `canvasCard.tsx`

### 右欄 — Inspector（260px 固定）

**內容（上→下）：**
- Inspector header（顯示目前選取的 region 名稱）
- Inspector tools（套用 Preset / 複製幾何 / 貼上幾何 / 重設 / 鎖定）
- Inspector fields（`overflow-y-auto`，獨立捲動）
- **底部固定：**
  - Asset Health Panel
  - Publishing Panels（從左欄移過來）

**元件拆分：** `DisplayEditorInspectorCard` 從 `cards.tsx` 獨立為 `inspectorCard.tsx`

## 技術實作重點

### 1. 繞過 PageScaffold，改用 PageContainer 直接

```tsx
// Before
<PageScaffold path="/display-pages/editor" description="...">
  {editorContent}
</PageScaffold>

// After
<PageContainer
  density="playback"
  shellPrimitive="management-scaffold"
  title={routeMeta.title}
  subtitle={routeMeta.subtitle}
  description="..."
  aside={<DisplayEditorPageTabs ... />}
>
  {editorContent}
</PageContainer>
```

需從 `routeMetaMap` 取出 `/display-pages/editor` 的 title / subtitle。

### 2. Grid 改為三欄 + viewport-locked

```tsx
// Before
<div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">

// After
<div className="grid h-full grid-cols-[220px_1fr_260px] overflow-hidden">
```

### 3. 各欄加獨立捲動

- 左欄 region list：`overflow-y-auto`
- 右欄 inspector fields：`overflow-y-auto`
- 中欄 canvas 本身不需捲動（內容以 transform/scale 控制）

### 4. 元件拆分

| 原始位置 | 拆分後 |
|----------|--------|
| `cards.tsx` → `DisplayEditorCanvasCard` | 移至 `canvasCard.tsx` |
| `cards.tsx` → `DisplayEditorInspectorCard` | 移至 `inspectorCard.tsx` |
| `regionTree.tsx` → `DisplayEditorSidebar` | 重命名為 `DisplayEditorLeftPanel`，移除 `onSelectPage` / `pageDefinitions` / `selectedPageId` props |

`cards.tsx` 在拆分完成後可刪除。

### 5. routeMeta 取用

`PageScaffold` 內部讀 `routeMetaMap`，繞過後需在 `DisplayPagesEditor` 自行讀取：

```tsx
import { routeMetaMap } from "../../app/routeMeta";
const routeMeta = routeMetaMap.get("/display-pages/editor")!;
```

## 不在此次範圍

- Canvas card 功能增強（未來 phase 再議）
- Inspector 欄寬可拖曳調整（未來考慮）
- 小螢幕 fallback（< 900px 時的降級設計未定義）
- Publishing Panels 內容本身的 UX 調整

## 受影響的檔案

- `apps/web/src/pages/DisplayPagesEditor/index.tsx`（主要改動）
- `apps/web/src/pages/DisplayPagesEditor/cards.tsx`（拆分後刪除）
- `apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx`（新增）
- `apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx`（新增）
- `apps/web/src/pages/DisplayPagesEditor/regionTree.tsx`（移除 page tabs props）
- `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`（更新對應測試）
