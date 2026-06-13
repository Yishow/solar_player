## Context

Playback Settings 是 settings surface 中最容易被 per-second tick 與 preview 更新放大的頁面。現在的 staged loading 已解決 first paint，但 editable form、page rows、runtime countdown、preview rail 仍彼此耦合。若先把這頁拆乾淨，後續 settings 其他頁的 isolation 會更好做。

## Goals / Non-Goals

**Goals:**

- 讓 runtime countdown 與 preview rail 更新不重組 editable form tree。
- 保留 save、reorder、display sync、preview status 的既有語意。
- 將本頁 isolation 邊界寫成可驗證 contract。

**Non-Goals:**

- 不處理其他 settings 頁。
- 不處理 shared preview foundation 或 playback runtime cache。

## Decisions

### Decision 1: Editable form tree is isolated from tick updates

editable form 與 page rows 只依賴 editable baseline；countdown、runtime progress、preview card status 只能更新自己的 subtree。

### Decision 2: Preview rail stays outside the editable lane

preview rail 與 runtime diagnostic 必須在 form 之外更新，避免 preview refresh 帶動 form rerender。

### Decision 3: No-regression save and sync behavior

save、page reorder、display sync、preview status 語意保持不變。

## Implementation Contract

- Behavior: Playback Settings 的 countdown、runtime progress、preview rail 更新 SHALL 不重建 editable form 與 page rows。
- Interface / data shape: loadModel 提供 editable baseline；runtime / preview subtree 只消費診斷資料。
- Failure modes: preview 或 runtime diagnostics refresh 失敗時，editable form 仍可用，並保留既有錯誤語意。
- Acceptance criteria: component tests 需證明 tick 與 preview update 不重組 form； save / display sync tests 需證明行為不退化。
- Scope boundaries:
  - In scope: Playback Settings isolation boundary。
  - Out of scope: other settings pages、shared preview foundation。

## Risks / Trade-offs

- [Risk] 分層過細會讓訊息狀態分散。 → Mitigation: 用 tests 固定 save banner 與 preview banner 可見行為。
