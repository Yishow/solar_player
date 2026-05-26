## Context

目前 media effect model 把 rendering intent 綁死在特定欄位名稱上：

- `edgeFade.direction + width`
- `bottomFade.height`
- `blur.amount`
- `opacity.value`

這個 shape 不知道效果要套在哪個區域，也沒有表示多個效果 stack 的能力。只要往上加 top、dual-edge、all-edges、preset、stacking，就會變成無止境加欄位。

## Goals

- 建立可擴充的 shared effect layer schema。
- 將 direction/coverage/strength 語言標準化，供 renderer 與 editor 共用。
- 保留既有 seeded / draft data 的相容讀取與可遷移路徑。

## Non-Goals

- 不在這包完成 renderer 視覺效果本身。
- 不在這包完成 editor UI 或 page rollout。
- 不在這包引入自由繪製 mask。

## Decisions

### Model media effects as typed layers instead of named booleans

effect payload 以陣列或有序 layer collection 表示，每個 layer 至少有：

- `kind`
- `zone`
- `enabled`
- `coverage`
- effect-specific parameters，例如 `amount`、`strength`、`feather`

### Normalize zones and support typing in shared code

shared layer model 要定義固定 zone vocabulary，例如 `top`、`bottom`、`left`、`right`、`top-bottom`、`left-right`、`all-edges`、`full-frame`，並提供 support typing 讓 page config 宣告某 surface 可用哪些 kinds 與 zones。

### Provide legacy compatibility before new authoring becomes canonical

既有 `edgeFade` / `bottomFade` / `blur` / `opacity` 不能直接斷掉。shared resolver 需要能讀舊資料，轉成 canonical layer model，並讓後續 editor 儲存時逐步落到新格式。

## Implementation Contract

**Behavior**

- shared resolver 能把 legacy effect data 解析成 canonical effect layers。
- canonical layer model 能表達同 zone 多效果與多 zone 多效果。
- page config 與 downstream consumers 能依 support typing 判斷可用效果。

**Data / schema**

- shared type exports 需提供 effect kinds、zones、layer type、support matrix、normalized resolver output。
- migration contract 需清楚區分 legacy read compatibility 與 new-write canonical shape。

**Failure modes**

- 若 canonical model 仍無法表示 same-zone stacking，視為未完成。
- 若 legacy seeded data 在新 resolver 下失效，視為重大 regression。
- 若 support typing 仍要靠 page-local string guessing，視為未完成。

## Verification

- `packages/shared/src/displayPageMediaEffects.test.ts` 驗證 canonical normalize、legacy compatibility、clamp 與 stacking shape。
- `apps/web/src/pages/displayPageSeeds.test.ts` 驗證既有 seeded media effects 仍可被解析。
- `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx` 驗證 support typing 能被 editor schema 使用。
