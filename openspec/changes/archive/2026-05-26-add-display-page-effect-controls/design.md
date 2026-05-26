## Context

目前 display surface 視覺 guardrail 已鎖住 hero typography、photo fade、ornament 與 shared chrome semantic tokens，但像 `Overview` 左側霧化這類效果仍是 page-local style 決策，沒有正式可調資料模型。這代表一旦 shared chrome、media placement 或 preview mode 重構，就可能在沒有任何 config contract 的情況下讓效果退化。

這個 change 的目的不是做完整視覺特效系統，而是把最需要穩定的 hero/media surface effects 抽成 bounded effect controls，讓編輯器與 playback 能走同一套 resolver。

## Goals / Non-Goals

**Goals:**

- 為支援的 hero/media surfaces 新增 bounded effect settings。
- 第一波涵蓋 edge fade、blur、overlay tint 或 opacity 這類與現有退化直接相關的效果。
- 讓 editor preview 與 playback runtime 共用同一個 effect resolver。
- 提供 validation、default values 與 fallback behavior。

**Non-Goals:**

- 不在這個 change 內引入任意 shader、動畫時間軸或混合模式編輯器。
- 不在這個 change 內把所有 CSS 效果都轉成 authorable settings。
- 不在這個 change 內新增文字物件效果。
- 不在這個 change 內處理 shell decorations 的 effect controls。

## Decisions

### Separate effect controls from raw page CSS

effect settings SHALL 從 page-local raw CSS 中抽離，保存為 page config 內的 bounded effect groups。這讓視覺效果有正式 data contract，可被測試、publish、preview 與 replay，而不是散落在 selector 細節裡。

替代方案是繼續只用 CSS class 調整。那在 shared chrome 或 media rendering 改動時，effect 很容易退化且沒有明確 owner。

### Scope first-wave effect controls to seeded hero or media surfaces

第一波 effect controls SHALL 只作用於 seeded hero/media surfaces，而不是對所有 region 任意開放。這可先解決使用者最在意的 photo fade 與霧化退化，同時把 schema 控制在可驗證範圍內。

替代方案是對每個 region 開放任意 effect。那會讓第一波 schema 和 editor controls 太大。

### Use token-aware effect presets plus bounded numeric controls

效果設定 SHALL 使用 token-aware defaults 搭配 bounded numeric fields，例如 fade width、blur amount、overlay opacity。這可保留 shared chrome 視覺語言，同時讓 operator 做有限度調整。

替代方案是直接暴露任意 CSS 字串。那幾乎無法做 validation，也會破壞 shared chrome 一致性。

### Keep runtime and editor preview on the same effect resolver

editor preview 與 playback runtime SHALL 共用同一個 effect resolver，避免 effect settings 在 editor 能看見、正式播放卻因不同 CSS 分支而失真。

替代方案是 editor 與 playback 各自計算效果。那會複製邏輯並製造 drift。

## Implementation Contract

**Behavior**

- 支援的 hero/media surfaces 可保存 effect settings，例如 edge fade、blur、overlay tint 或 opacity。
- `Overview` 左側霧化這類效果改由 effect config 驅動，而不是只靠 page-local CSS 假設。
- editor preview 與 playback runtime 顯示相同的 effect 結果。
- effect settings 若超出允許範圍，save/publish 或 resolver 會回退到合法 defaults，而不是讓畫面不可讀。
- effect settings 至少支援明確開關，讓 operator 可以停用單一效果，而不是只能把數值調到接近零。

**Interface / data shape**

- shared package 匯出 effect config schema、default builders、range guards 與 resolver helpers。
- 支援 effect 的 page config 會新增對應 effect group，但不取代既有 media placement group。
- inspector fields 需對支援 surfaces 暴露 bounded numeric 或 enumerated effect controls，而不是任意 CSS 字串。
- inspector fields 需為每個支援 effect group 暴露 enable/disable 狀態與 bounded values。

**Failure modes**

- 無效 effect values 應被 validation 或 resolver 修正為 safe defaults，並向管理面保留可診斷狀態。
- 不支援 effect controls 的 surface 不可默默接受 effect payload；它們應回退為 seed defaults。
- 若 effect resolver 失敗，media 仍需正常顯示，不得讓整塊 hero 消失。

**Acceptance criteria**

- config or resolver tests 可驗證 default values、range guards 與 effect translation。
- page preview/runtime tests 可驗證 editor 與 playback 使用相同 effect resolver。
- `pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` 通過。
- `spectra validate --strict --changes add-display-page-effect-controls` 通過。

**Scope boundaries**

- In scope: hero/media surface effect settings、bounded controls、shared resolver、overview fade regression coverage。
- Out of scope: arbitrary CSS editors、動畫、文字效果、shell object effects。

## Risks / Trade-offs

- [風險] 效果參數若給太多，operator 仍可能做出破壞一致性的設定。 → Mitigation：第一波只暴露 bounded effect groups 與 token-aware defaults。
- [風險] 各頁 media 結構不同，effect resolver 可能需要 page-specific branching。 → Mitigation：先限定在 seeded hero/media surfaces，讓 resolver 的輸入保持可預期。
- [風險] 把 CSS 效果資料化後，測試面會增加。 → Mitigation：以 shared resolver 與 config tests 集中驗證，不把所有檢查分散到 page-local CSS snapshots。
