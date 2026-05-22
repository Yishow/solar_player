## Context

shared live preview catalog 目前以 canonical `displayPageKey` 建立 `states` map，`Playback Settings` 與 `Slideshow Preview` consumer 再用 `templateKey` 或 route-derived template key 查 preview。這在單一 built-in page family 還能工作，但一旦 registry 同時存在 `overview` 與 `overview-2` 這類 duplicate instance，兩個 page instance 會共用同一份 live preview state，即使它們的 live config、slug 或 publish history已不同。

這個問題不在 renderer 缺失，而在 preview state identity 設計錯誤：renderer identity 應該是 template-based，但 preview state identity 應該是 page-instance-based。此 change 需要把兩者拆開，同時保持現有 preview renderer registry 可重用。

## Goals / Non-Goals

**Goals:**

- 讓 live preview state 對位到實際 page instance，而不是只對位到 template key。
- 讓 `Playback Settings` 與 `Slideshow Preview` 的 duplicate template instances 顯示各自 live config 的預覽。
- 讓 preview consumer 在 registry mutation 或 publish 後能收斂到正確的 instance-specific preview state。

**Non-Goals:**

- 不改 `DisplayPagesEditor` 的 renderer registry 或 page authoring schema。
- 不重做 preview 視覺樣式，也不新增新的 preview-only API。
- 不解決 playback shell metadata、footer nav 或 offline routing；那些由其他 change 處理。

## Decisions

### Decision: Separate preview renderer identity from preview state identity

template renderer registry 繼續以 `DisplayPageTemplateKey` 作為 renderer identity，因為 renderer 真正決定的是「怎麼畫這一類頁面」。但 live preview state 需要改成以 page instance identity 作為 key，至少要能區分不同 `pageKey` 或 registry instance。consumer 先用 page instance 取 state，再把對應的 template renderer 套上去。

### Decision: Load instance-aware preview state from registry-backed live config reads

shared preview catalog 不再只走 canonical `displayPageKeys`。它必須依 active registry page list 逐一讀取 live config，為每個 page instance 生成 state；如此 duplicate instance 才能對應到自己的 live envelope、published state 與 asset findings。

### Decision: Keep consumer fallback behavior explicit when instance lookup fails

當 consumer 找不到 page instance 對應的 preview state 時，必須明確顯示是 `loading`、`unpublished`、`renderer-unavailable` 或 `config-unavailable`，而不是偷偷 fallback 到同 template 的另一張 preview。這樣 `Slideshow Preview` 與 `Playback Settings` 才能保有診斷可信度。

## Implementation Contract

- Behavior:
  - `Playback Settings` 與 `Slideshow Preview` 對 duplicate template instances SHALL 顯示各自對應 page instance 的 live preview，而不是共用同 template 的 preview state。
  - 當某個 page instance 尚未 publish、live config 無法載入或已被 archive 時，consumer SHALL 顯示該 instance 自身的 fallback state，而不是借用其他 instance 的 ready preview。
- Interface / data shape:
  - shared live preview catalog SHALL 提供 instance-keyed state lookup，consumer 傳入 page instance identity 後可拿到對應 state。
  - template renderer registry 仍 SHALL 以 `DisplayPageTemplateKey` 選擇 renderer，不需要改成 per-instance renderer。
- Failure modes:
  - registry reload 中若尚未拿到某 instance 的 state，可暫時顯示 `loading`；但 SHALL NOT 顯示其他 instance 的 ready preview。
  - renderer 缺失時，state 可為 ready 以外的 fallback status，但 SHALL 保留 instance label 與原因說明。
- Acceptance criteria:
  - 自動測試需覆蓋 duplicate template instance 擁有不同 live config 時的 preview 對位、unpublished instance 的 fallback、以及 registry mutation 後 state 收斂。
  - `pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/web build` SHALL 通過。
- Scope boundaries:
  - In scope: shared live preview catalog state identity、Playback Settings preview lookup、Slideshow Preview preview lookup、instance-aware fallback semantics。
  - Out of scope: preview renderer redesign、management shell changes、server preview API schema 變更。

## Risks / Trade-offs

- [Risk] instance-aware catalog 會增加 state map 與 live config fetch 次數。
  → Mitigation: 先重用既有 live config read path，後續若需要再做 batching/caching，而不是在此 change 先擴 API。
- [Risk] consumer 同時握有 page instance identity 與 template renderer identity，若 mapping 做錯會出現 renderer/state 不匹配。
  → Mitigation: 將 lookup API 明確分成「state by instance」與「renderer by template」兩步，避免隱性 fallback。
- [Risk] 若 apply 時把 preview contract 與 shell metadata 一起重構，會把 scope 拉大。
  → Mitigation: tasks 只允許觸及 shared preview catalog 與兩個 preview consumers。
