# Solar Display Phase 1

`solar-display` 是國瑞汽車中廠綠能展示播放器的 Phase 1 monorepo 骨架，目標是先把前後端執行底座、SQLite 初始化、OpenAPI 文件入口與 shared types 建好，讓後續 Phase 可以直接往功能面擴充。

## 技術選型

- Frontend: Vite + React + TypeScript + React Router + Tailwind CSS
- Backend: Node.js + Fastify + TypeScript + better-sqlite3
- Monorepo: pnpm workspace
- API 文件: OpenAPI 3.1 + Swagger UI
- Database: SQLite

## 專案結構

```text
solar-display/
  apps/
    server/
    web/
  packages/
    shared/
  data/
  uploads/images/
  docs/openapi.yaml
```

## 啟動方式

```bash
cd solar-display
pnpm install
pnpm run dev
```

前端預設會由 Vite 啟動，後端預設監聽 `http://localhost:3000`，Swagger UI 位於 `http://localhost:3000/docs`。

## 常用指令

```bash
pnpm run build
pnpm run db:migrate
pnpm run db:seed
```

## Phase 1 範圍

- 建立 `web`、`server`、`shared` workspace package
- 建立 React Router 與共用 Layout skeleton
- 建立 Fastify 啟動流程、CORS、Swagger UI、統一錯誤格式
- 建立 SQLite connection、migration runner、seed runner
- 建立 `packages/shared` 型別定義

## Design Tokens

Phase 1 前端樣式已先落入 `apps/web/src/styles/tokens.css`，內容依既有規格定義：

- Brand / neutral colors
- Radius / spacing / layout
- Typography
- Motion

這些 token 會作為後續多頁面實作的基礎。
