## Context

目前 effect pipeline 已有 media-level values，但「blur」偏向整張素材處理；edge fade 偏向 opacity mask。霧化需求比較像局部邊緣融合：畫面主體仍清楚，特定邊緣產生柔化、霧面、淡入背景的可見 layer。

## Goals

- 讓霧化在預覽與播放畫面肉眼可見。
- 將效果約束在 media layer 內，不破壞 page content 與 shell chrome。
- 讓 editor controls 操作後能即時看到相同的 runtime rendering。

## Non-Goals

- 不新增任意 shader 或 canvas rendering pipeline。
- 不重寫全部 page visual treatment。
- 不改 asset upload、image playlist 或 shell decoration schema。

## Decisions

### Mist Layer

The renderer SHALL support a localized mist layer derived from existing effect settings. The layer MAY use CSS pseudo-elements or adjacent DOM elements, but it MUST be owned by the shared media renderer so editor and playback stay consistent.

### Bounded Defaults

Default mist values SHALL be conservative and page-specific. Overview MAY enable a left-edge mist by default because its hero artwork is expected to blend into adjacent content. Other pages SHALL keep current defaults unless the page already declares an effect need.

### Control Mapping

Existing blur/fade controls SHALL remain the operator-facing entry point. If additional internal values are needed for mist strength or direction, they SHALL be derived from existing config unless a minimal schema extension is required.

## Verification

- Unit tests assert mist layer style output for enabled and disabled states.
- Runtime preview tests assert editor and playback render the same effect classes or style tokens.
- Visual smoke checks focus on Overview hero image because that is where the missing fog effect was reported.
