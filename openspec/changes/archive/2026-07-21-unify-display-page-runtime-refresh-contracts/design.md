## Context

五個 display pages 已共享 `useDisplayPageConfig()`、draft/live stage 與固定 FHD canvas，但 runtime data composition 仍停留在 page-local hooks：`Overview`、`Solar`、`FactoryCircuit` 多半 mount 後抓一次 story；`Images` 依 active index 抓 playlist；`Sustainability` 依 selected period 抓 story。這表示相同等級的 runtime 事件，例如 display page publish、story source 更新、asset health 或同步失敗，在五頁的重新整理時機與 fallback 呈現上沒有一致 contract。

## Goals / Non-Goals

**Goals:**

- 給五個 display pages 一套共用的 runtime refresh lifecycle。
- 明確定義 page-to-source mapping、refresh trigger、參數 key 與 stale / error / fallback semantics。
- 保留各頁既有視覺與 seed fallback 契約，不把版面對齊工作重新打開。

**Non-Goals:**

- 不改五頁的幾何、card family 或 editor region schema。
- 不合併五頁成單一通用 view model。
- 不處理 management preview surface；那是 live preview change 的範圍。

## Decisions

### Shared runtime refresh hook family

建立 shared hook family，而不是讓五頁直接在 component 內各自 `useEffect(fetch...)`。`Overview`、`Solar`、`FactoryCircuit` 共用同一個 display story runtime hook；`Images` 使用 playlist runtime hook；`Sustainability` 使用 period-aware story runtime hook。這樣 shared behavior 可以集中處理 bootstrap、sync refresh、loading、stale 與 error state。

替代方案是只抽一個超通用 `useRuntimeSource()`，但目前三種 source 形狀差異仍大，直接抽太泛的 hook 反而會把型別與行為藏在 condition branch 裡。

### Page-to-source refresh registry

引入 registry，明確記錄每個 display page 對應的 runtime source、是否受 `display:sync` 影響、refresh key 由哪些參數組成，以及失敗時的 fallback 文案來源。這比散落在每個 page component 內更容易 audit，也能讓 editor / preview 後續重用同一份 mapping。

替代方案是維持各頁自行宣告 refresh 依賴，但那會延續現在的 drift：新增頁面或新事件時，很難確保所有頁一起更新。

### Common stale and error semantics

共用 hooks 需要輸出一致的 runtime state：`isLoading`、`isRefreshing`、`errorMessage`、`lastResolvedAt`、`usesFallback`。page component 只決定如何把這些狀態映射到現有 `RuntimeConfigFallbackBanner`、summary helper 或 placeholder，不再各自定義「抓不到資料時要設 null 還是保留舊值」。

替代方案是只統一 reload trigger，不統一 state shape；但那仍會讓某些頁在失敗時清空、某些頁保留舊值，無法形成可預期的 runtime contract。

## Implementation Contract

- Behavior:
  - 五個 display pages 在 runtime mode 下 SHALL 經過一致的 lifecycle：bootstrap config、bootstrap data source、接收 relevant sync trigger、refresh page-specific runtime source、輸出共通 stale/error/fallback state。
  - `Overview`、`Solar`、`FactoryCircuit` SHALL 共用 display story refresh semantics；`Images` SHALL 共用 playlist refresh semantics；`Sustainability` SHALL 以 selected period 為參數共用 story refresh semantics。
  - runtime refresh 失敗時，頁面 SHALL 維持既有 seed fallback 或最近一次可用內容，並輸出一致的錯誤 / fallback indicator。
- Interface / data shape:
  - 需要 registry 描述 page key、source kind、refresh trigger、refresh key 參數。
  - 需要 shared hook return shape，至少包含 payload、loading、refreshing、error、fallback/stale indicators。
- Failure modes:
  - 若 source bootstrap 失敗，頁面 SHALL 進入 fallback state，而不是整頁崩潰。
  - 若 refresh 期間收到新的 trigger，可取消或覆蓋舊請求，但 MUST NOT 導致跨頁顯示錯置的 payload。
- Acceptance criteria:
  - 新增測試覆蓋 shared hooks、registry mapping 與至少一頁的 refresh failure behavior。
  - 五頁的 runtime index file 不再各自持有 page-local fetch-once logic。
  - `pnpm exec spectra analyze unify-display-page-runtime-refresh-contracts` 與 `pnpm exec spectra validate --strict --changes unify-display-page-runtime-refresh-contracts` 通過。
- Scope boundaries:
  - In scope: runtime source lifecycle、trigger registry、shared stale/error semantics。
  - Out of scope: visual redesign、preview surfaces、editor inspector UX。

## Risks / Trade-offs

- [Risk] hook family 切分不當，變成另一個過度抽象層 → Mitigation: 依 source kind 分三個 hook，而不是一個泛型 hook 吞所有頁。
- [Risk] refresh registry 與 route/page definitions 漂移 → Mitigation: 用 tests 鎖住 page-to-source mapping，新增頁面時必須更新 registry。
- [Risk] failure state 統一後，個別頁面的 copy 失去語境 → Mitigation: hook 輸出共通 state，頁面仍保留自身文案映射權。
