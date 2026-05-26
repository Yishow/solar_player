# Display Surface Visual Review Checklist

日期：2026-05-27

## Scope

這份 checklist 只服務 playback review surface：

- `/overview`
- `/solar`
- `/factory-circuit`
- `/images`
- `/sustainability`

先看 witness pair，再談實作。review 不得只靠「看起來差不多」。

## Canonical Witness Pair

每次 playback visual change 都先打開：

1. `docs/reference-match/playback-visual-canonicals.md`
2. 對應頁面的 FHD image witness
3. 對應頁面的 prototype/spec witness

`Live preview mode` 只能當輔助確認，不能取代 witness pair。

## Required Review Dimensions

- `Hero typography`
  - 檢查 bilingual title、eyebrow、lead copy 是否仍維持原本的展示層級，不要被 management heading 或 dense control label 拉平。
- `Hero hierarchy`
  - 檢查主要注意力先落在 hero / story / key metric，而不是 toolbar、table、settings board。
- `Photo fade`
  - 檢查主圖或媒體疊層的 fade treatment 是否仍保留，不可把過渡硬切成平板白底。
- `Card family`
  - 檢查 DisplayCardFrame / header / footer 的族系是否還在，不要混進 generic dashboard card。
- `Card-family rhythm`
  - 檢查 KPI 卡、資訊卡、highlight 卡之間的高度、留白、底部節奏是否還像 witness。
- `Ornament consistency`
  - 檢查葉形、水印、線性飾條、光暈裝飾是否仍是 display 語言，不要突然換成 admin badge。
- `Source-like icon language`
  - 檢查 icon 仍是 source-like symbol，不要退化成 toolbar glyph、表單 icon、control icon。
- `Absolute composition`
  - 檢查 page-specific absolute region 關係是否仍成立，不能把焦點區塊改成 generic board stack。
- `FHD geometry`
  - 檢查 FHD safe zone、left/top/width/height 與距離節奏沒有被 style cleanup 默默帶偏。
- `Distance readability`
  - 檢查 3~5 公尺觀看時的標題、主數值、主圖層級依然清楚。

## Drift Checks

- `management-surface drift`
  - 不得把 playback hero、KPI、media、focus composition 改成 management board、table-first panel、toolbar stack。
- `Protected canonical status`
  - 每個受影響頁面都要記錄是 `preserved`、`changed intentionally`、或 `blocked by exception`。
- `Documented exception`
  - 只有在 witness 無法直接沿用時才可例外，必須寫明受影響區塊、原因、替代做法。

## Review Record Template

| Route | Witness pair checked | Protected canonical status | Preserved or changed | Documented exception |
| --- | --- | --- | --- | --- |
| `/example` | `FHD + prototype/spec` | `preserved` | `Hero hierarchy preserved; Card-family rhythm preserved` | `none` |

## Shared Primitive Exceptions

以下情況可以保留既有例外，但不得擴散成新的 shared chrome 常態：

- `data:image/svg+xml`
  - 允許用於既有 inline asset data URI。
- `mask`
  - 允許用於既有 hero / media crop treatment。
- `漸層`
  - 允許用於既有 photo fade、ornament glow、media mist treatment。

## Pass Criteria

- reviewer 能指出這次變更依據哪個 witness pair
- reviewer 能說出哪些 canonicals 被保留
- 若有偏離，review artifact 已經留下 `Documented exception`
- playback 頁面沒有因 shared primitive reuse 發生 `management-surface drift`
