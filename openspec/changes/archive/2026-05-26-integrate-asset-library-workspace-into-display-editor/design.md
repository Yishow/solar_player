## Context

Asset Library 的資料與 API 可以被保留，但 authoring 入口需要重新定位。Operator 在 editor 內決定頁面圖像、物件圖、shell 裝飾圖；切到 `/settings/assets` 會中斷上下文，也讓「圖庫頁」看起來像一個獨立簡化設定頁，而不是 editor 的資產面板。

## Goals

- 將圖庫整合到 `/display-pages/editor` 同一路由。
- 提供比現有獨立頁更完整的 asset browsing、management、usage visibility。
- 讓 picker context 可從 page editor 或 shell workspace 進入，並能返回原本編輯位置。

## Non-Goals

- 不重寫 server asset storage。
- 不取消現有 delete guards 或 usage reporting。
- 不把 image playlist governance 併入此圖庫；playlist 管理仍維持自己的播放清單語意。

## Decisions

### Workspace Model

Display Pages Editor SHALL expose an asset library workspace beside page authoring and shell authoring workspaces. The URL may encode the workspace through query state, but the browser route remains `/display-pages/editor`.

### Gallery Depth

The integrated gallery SHALL show enough operational context for editing:

- category and usage-scope filters
- searchable asset cards
- preview/detail panel
- upload entry point
- reference count and usage locations
- disabled or explained delete action when references exist

### Legacy Route Handling

The existing `/settings/assets` entry MAY remain as a redirect or compatibility link, but it MUST NOT be the primary management experience once the integrated workspace exists.

## Verification

- Route tests assert the integrated gallery is reachable from `/display-pages/editor`.
- Component tests cover category filtering, usage details, upload entry, and delete guard messaging.
- Existing asset API tests remain valid because this change is UI routing and workspace integration first.
