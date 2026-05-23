## Context

`apps/web/src/components/DisplayCanvas.tsx` 以固定 `DESIGN_WIDTH=1920`、`DESIGN_HEIGHT=1080` 的絕對定位 frame，套 `transform: scale(scale.x, scale.y)`（`scale.x = viewport.width/1920`、`scale.y = viewport.height/1080`），`transformOrigin: top left`。所有播放頁皆在 1920×1080 設計座標內以絕對定位排版，縮放只發生在此外層。`--stage-bg`（米色）為既有舞台底色 token。viewport 量測使用 `window.visualViewport` 或 `innerWidth/innerHeight`。

## Goals / Non-Goals

**Goals:**

- 以等比縮放保留設計長寬比，消除非 16:9／portrait 的拉伸變形。
- 非 16:9 時以 letterbox 置中，留白使用 `--stage-bg`。
- 16:9 viewport 行為與現況像素級一致。
- 版面計算抽為可測純函式。

**Non-Goals:**

- 不改任何播放頁的內部排版（仍為 1920×1080 設計座標）。
- 不改 viewport 量測來源。
- 不處理 portrait 專屬版面設計（本變更只確保不變形，不重排版）。

## Decisions

- **版面計算抽為純函式 `computeCanvasLayout`**：放在 `apps/web/src/components/displayCanvasLayout.ts`，輸入 `viewport` 與 `design`，輸出 `{ scale, offsetX, offsetY }`。理由：縮放與置中數學可用 vitest 以表格完整覆蓋，`DisplayCanvas` 只做渲染接線。
- **等比 scale 取較小 fit 比例**：`scale = min(viewport.width/design.width, viewport.height/design.height)`，保證縮放後不超出 viewport。
- **置中位移**：`offsetX = (viewport.width - design.width*scale)/2`、`offsetY = (viewport.height - design.height*scale)/2`，使留白平均分配。
- **transform 改為 `translate(offsetX, offsetY) scale(scale)`**：維持 `transformOrigin: top left`，以位移完成置中；letterbox 底色設於外層 viewport 容器（`--stage-bg`）。
- **16:9 等價保證**：viewport 為 16:9 時 `offsetX=offsetY=0` 且 `scale.x==scale.y==scale`，渲染與現況一致。

## Implementation Contract

- **Behavior**：非 16:9／直向螢幕上內容維持正確長寬比並置中，兩側或上下出現 `--stage-bg` 留白；16:9 螢幕呈現與現況完全相同（無留白、無位移）。
- **Interface / data shape**：
  - `computeCanvasLayout(viewport: { width: number; height: number }, design: { width: number; height: number }): { scale: number; offsetX: number; offsetY: number }`。
  - `DisplayCanvas` 以 `style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})``、`transformOrigin: "top left"` 渲染 frame；外層 `display-canvas-viewport` 容器背景設為 `var(--stage-bg)`。
- **Failure modes**：viewport 寬或高為 0／非有限值時 `computeCanvasLayout` 回傳 `scale` 退回不致除以零的安全值（例如沿用上一個有效值或回傳 scale=0 不渲染）並不丟例外；SSR（無 window）時沿用既有預設 design 尺寸。
- **Acceptance criteria**：
  - `apps/web/src/components/displayCanvasLayout.test.ts` 覆蓋 spec Example 表四列（1920×1080、1280×720、1920×1200、1080×1920）的 scale 與 offset（容許浮點誤差）。
  - `DisplayCanvas` 測試或既有 shell 測試斷言：16:9 viewport 下 offset 為 0；非 16:9 下有非零 offset 且 transform 使用單一 scale。
  - `pnpm --filter @solar-display/web test` 全綠、`pnpm --filter @solar-display/web build` 型別通過。
- **Scope boundaries**：
  - In scope：`computeCanvasLayout` 純函式、`DisplayCanvas` 改用等比 scale + 置中 + letterbox 底色、對應測試。
  - Out of scope：播放頁內部排版、portrait 專屬設計、viewport 量測來源、其他 shell 元件。

## Risks / Trade-offs

- **非 16:9 出現留白**：屬等比縮放必然取捨；以 `--stage-bg` 維持調性，優於變形。
- **開發預覽差異**：以非 16:9 視窗預覽時會從「拉伸填滿」變為「置中留白」；production 若為 16:9 則最終呈現不變。
