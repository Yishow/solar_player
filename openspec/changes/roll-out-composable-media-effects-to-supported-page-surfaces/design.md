## Context

effect capability 不該被當成全站一鍵開。不同 page media surfaces 的內容角色不同，有些適合 localized effects，有些只適合 full-frame，有些目前根本不該開放。這包的工作是把 rollout matrix 寫死，避免 spec 跟實作再漂掉。

## Goals

- 建立 per-surface support matrix。
- 優先讓高需求 surface 完整支援 composable effects。
- 對未支援 surface 顯示明確 explanation。

## Non-Goals

- 不在這包定義 shared schema 或 renderer。
- 不在這包新增 presets。

## Decisions

### Roll out support per media surface instead of per page family slogan

同一頁裡不同 media surfaces 支援能力可以不同。support matrix 要掛在實際 media surface，而不是籠統地說「Images 頁支援 effects」。

### Start with the most visible managed media surfaces

第一批完成 `Overview hero`、`Images main stage` 等最常被替換、最需要霧化與局部特效的 surface。其他 surface 沒跟上時，要顯示 explanation，而不是看起來像 bug。

## Implementation Contract

**Behavior**

- 支援 surface 顯示完整 composable effect authoring。
- 未支援 surface 顯示原因與目前限制。
- editor schema 與 page config 對 support matrix 保持一致。

**Failure modes**

- 若 page config 和 editor schema support matrix 不一致，視為重大問題。
- 若未支援 surface 靜默缺 controls，視為未完成。

## Verification

- `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx` 驗證 support matrix。
- `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx` 驗證 supported vs unsupported states。
- 至少一個 route-level editor render test 驗證 rollout surface 可用。
