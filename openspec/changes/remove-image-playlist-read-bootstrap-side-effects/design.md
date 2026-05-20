## Context

`Images` 頁面目前已經同時有 runtime playlist 與 governance playlist 兩種使用情境，但 service 層仍把「讀可播放 playlist」與「建立治理 rows」耦合在一起。這讓播放端或任何 preview/read path 都可能因為單純 hydration 而寫入 DB，破壞 read purity，也讓後續觀察誰真正初始化治理資料變得困難。現有 `/api/image-playlist/governance/bootstrap` 其實已經提供 operator 顯式 bootstrap 入口，因此 runtime read path 不該繼續承擔隱式寫入責任。

## Goals / Non-Goals

**Goals:**

- 讓 runtime playlist read 完全 side-effect free。
- 當 governance rows 不存在時，仍能算出可播放的 resolved playlist。
- 把顯式 bootstrap 保留在治理流程中，讓 operator 能清楚知道何時建立 rows。

**Non-Goals:**

- 不改 playlist entry 的欄位模型或 fallback semantics。
- 不導入新的 background bootstrap job。
- 不在這個 change 內處理 image management optimistic concurrency。

## Decisions

### Decision: Runtime read resolves an ephemeral playlist view instead of persisting missing rows

當 governance rows 缺失時，runtime SHALL 依既有 assets 與已存在 rows 解析出一份可播放的 ephemeral playlist view，而不是直接把缺漏 rows 寫回 DB。這能保持播放 read purity，同時保留現有排序、duration 與 fallback 規則。

替代方案是讓 runtime 繼續自動補齊 rows，再用 query flag 關閉。那會讓 API semantics 繼續模糊，也讓忘記帶 flag 的 caller 仍會寫資料，因此不採用。

### Decision: Governance bootstrap remains an explicit management action

`/api/image-playlist/governance/bootstrap` 已經是明確的治理行為，因此這個 change SHALL 把 row 建立責任集中在這裡，或同等的 management-only bootstrap API。runtime 與 preview hydration 不應再觸發它。

替代方案是完全移除 bootstrap API，要求 operator 透過逐筆編輯建立 rows。這會讓初始治理成本過高，也和既有 UX 不符，因此不採用。

### Decision: Preserve the existing runtime payload shape when rows are absent

播放端不應因為治理 rows 尚未建立就拿到完全不同的 payload shape。這個 change SHALL 讓 resolved runtime payload 盡量維持既有 `activeEntry`、`entries`、`generatedAt`、`hasPlaylistRows` 合約，只把資料來源改成純讀解算。

替代方案是當 rows 缺失時改回傳另一種 bootstrap-needed envelope。那會把播放 read 與管理 bootstrap decision 綁死，不採用。

## Implementation Contract

- Behavior:
  - `GET /api/image-playlist` 或等價 runtime read route 不得建立新的 playlist rows。
  - governance bootstrap action 才能建立缺失 rows，且執行後仍會送出既有 images/display sync invalidation。
  - runtime playlist 在無 rows 時仍可依 image assets 解析出可播放結果。
- Interface / data shape:
  - runtime resolved playlist payload 維持既有 shape，讓播放端與 preview 端不需改動大量 render code。
  - governance snapshot payload 仍保留 `entries` 與 `resolvedEntries`，並可指出目前是否已有持久化 rows。
- Failure modes:
  - 若 image assets 為空，runtime read 回傳空 playlist 而不是嘗試 bootstrap。
  - 若治理 rows 部分缺失，runtime 以疊合解析補足播放 view，但不自動持久化缺口。
- Acceptance criteria:
  - server tests 證明 runtime read 不會寫 DB，顯式 bootstrap 才會建立 rows。
  - web tests 覆蓋 runtime hook 改成純讀後仍能在 rows 缺失時顯示內容。
  - `spectra analyze`、`pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 通過。
- Scope boundaries:
  - In scope: runtime read purity、bootstrap responsibility split、Images runtime hydration contract。
  - Out of scope: playlist schema redesign、management concurrency、UI restyling。

## Risks / Trade-offs

- [Risk] 無 rows 時 runtime order 可能與治理端預期不一致。 → Mitigation: 明確規定 fallback order 仍以 image asset display order 與既有 overlay 規則解算。
- [Risk] 既有 tests 依賴 `bootstrap=true` 的 side effect。 → Mitigation: 將 mutation expectations 移到 explicit governance bootstrap tests，runtime tests 改驗證 zero-write read。
- [Risk] `hasPlaylistRows` semantics 被誤用成「是否可播放」。 → Mitigation: 在 spec 明確區分 `hasPlaylistRows` 與 resolved playlist playability。
