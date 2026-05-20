## Context

display page draft flow 已經有 `version`、`updatedAt` 與 local draft session，但 version 目前只被當成狀態資訊，並沒有真正參與 save precondition。這代表多個 operator 或同一人開多個分頁時，只要最後一個請求較晚到達，就能無條件覆蓋先前保存。由於 display page editor 是高價值管理面，草稿遺失很難從 publish history 補救，因此需要先把儲存 contract 升級成 optimistic concurrency。

## Goals / Non-Goals

**Goals:**

- 為 display page draft save 建立版本前置條件。
- server 在 stale save 時回傳可程式化處理的 conflict envelope。
- 前端在 conflict 時保留本地編輯與 last loaded baseline，讓 operator 能重新同步後再決定下一步。

**Non-Goals:**

- 不做即時多人游標或 merge editor。
- 不把所有 management 資源一次納入 concurrency；先針對已具備 version envelope 的 draft config 資源落地。
- 不在這個 change 內改 publish / rollback semantics。

## Decisions

### Decision: Use envelope version as the optimistic concurrency token

display page config envelope 已經提供 `version`，因此這個 change SHALL 直接以它作為 save precondition，而不是再引入額外 ETag/opaque token。client 儲存時帶上 `baseVersion`，server 只有在目前 draft version 仍等於該值時才接受寫入。

替代方案是用 `updatedAt` 字串或完整 config hash。這會受到時間解析與序列化細節影響，也沒有現成 shared contract，不採用。

### Decision: Return an explicit conflict envelope instead of silently reloading

當 save 發生 version mismatch 時，server SHALL 回傳 409 conflict，並附上目前 server draft envelope 或等價最新基線，讓前端能保留本地變更後提示 operator。這比直接 200 + 覆寫、或自動刷新後丟失本地變更更安全。

替代方案是 server 自動 merge 或直接覆寫。前者在 layout/config 結構上風險高，後者就是目前問題，因此都不採用。

### Decision: Keep the conflict contract reusable for other management draft surfaces

雖然這輪先套用在 display page draft，但 shared contract SHALL 以 generic management draft save conflict 命名，讓未來 image management 或其他 versioned draft 資源可以沿用相同 envelope 與 UX pattern。

替代方案是把 conflict shape 寫死在 display page route 私有欄位。那會讓後續重用成本提高，因此不採用。

## Implementation Contract

- Behavior:
  - draft GET 回傳的 version 可直接作為下一次 save 的 base version。
  - stale save 會收到 409 conflict 與最新 server draft baseline。
  - 前端 conflict 後保留本地 draft session，不自動丟棄使用者未儲存變更。
- Interface / data shape:
  - `updateDisplayPageConfig` 或等價 API 需接受 `baseVersion`。
  - conflict response 需包含明確 error code 與最新 server envelope，供 UI 重新同步或比較。
- Failure modes:
  - 若 client 未提供 base version，server 可拒絕儲存或走明確 legacy fallback；本 change 建議統一要求提供 precondition。
  - 若 route / registry 對應頁面不存在，仍維持既有 404 semantics，不混成 conflict。
- Acceptance criteria:
  - server tests 覆蓋成功 save、stale save conflict、conflict 回傳最新 envelope。
  - web tests 覆蓋 hook 儲存時會送 base version、收到 409 後保留 dirty state 並呈現 conflict message。
  - `spectra analyze`、`pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 通過。
- Scope boundaries:
  - In scope: display page draft optimistic concurrency、shared conflict envelope、editor conflict handling。
  - Out of scope: real-time collaborative editing、image management save concurrency、publish merge policy。

## Risks / Trade-offs

- [Risk] legacy callers 未帶 `baseVersion` 會在 rollout 初期失敗。 → Mitigation: 同步更新所有 first-party callers，必要時在 error message 中明確提示缺少 precondition。
- [Risk] conflict UX 若只顯示 generic error，operator 仍不知道怎麼處理。 → Mitigation: 在 hook / editor 中保留最新 server envelope 與清楚的 resync guidance。
- [Risk] version 僅在保存時遞增，某些本地-only dirty changes 可能仍互相踩到。 → Mitigation: 明確把 authoritative boundary 定義在 server save，而不是本地編輯階段。
