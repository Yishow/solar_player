## Why

目前的 FHD prototype 對齊工作如果沒有先固定共享 shell 與 14 頁 mapping baseline，後續任何 route-specific 改版都會把殼層、頁碼、page density、reference-only content 判斷重複寫進各頁，造成 AI 跳步與返工。這個 change 的目的，是把所有後續頁面遷移共用的前置契約先做成獨立工作包。

## What Changes

- 建立共享 FHD shell foundation，先收斂 `LayoutShell`、`AppHeader`、`AppFooterNav`、`PageScaffold`、`PageContainer`、page number 與 density variants 的完成條件。
- 建立 14 頁 prototype-to-runtime baseline mapping，逐頁列出 prototype source、React route、主要元件、主要 runtime data source、reference-only content 與 fallback-only content。
- 定義 downstream phases 必須沿用的 verification matrix 與 evidence bundle contract。

## Capabilities

### New Capabilities

- `fhd-shell-foundation`: 定義共享 FHD shell、共享 primitives、density variants 與 shell witness verification。
- `prototype-page-mapping-baseline`: 定義 `01-14` prototype page 的 baseline mapping、content classification 與 phase verification matrix。

### Modified Capabilities

(none)

## Impact

- Affected specs: `fhd-shell-foundation`, `prototype-page-mapping-baseline`
- Affected code:
  - Modified:
    - `apps/web/src/layouts/LayoutShell.tsx`
    - `apps/web/src/components/AppHeader.tsx`
    - `apps/web/src/components/AppFooterNav.tsx`
    - `apps/web/src/components/PageContainer.tsx`
    - `apps/web/src/components/PageNumberPill.tsx`
    - `apps/web/src/pages/shared/PageScaffold.tsx`
    - `apps/web/src/styles/tokens.css`
    - `apps/web/src/styles/global.css`
    - `apps/web/src/app/routeMeta.ts`
  - New:
    - `apps/web/src/components/` 下與 shell 對齊的新共享 primitives 檔案
    - `openspec/changes/align-solar-display-shell-and-mapping-foundation/specs/`
  - Removed:
    - (none)
