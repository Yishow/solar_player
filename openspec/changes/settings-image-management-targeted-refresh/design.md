## Context

Image Management 已經能先顯示 library 與治理列表，但 mutation 後的 refresh 還偏向整包思維：已知的 asset library、selected image、playlist baseline 常跟 diagnostics 一起重讀。對這頁來說，最佳切法是以 selected entity 為中心，只刷新真正依賴 mutation 的 diagnostics 或 payload。

## Goals / Non-Goals

**Goals:**

- 讓 metadata save、upload、set cover、playlist governance 更新只刷新必要 diagnostics。
- 保留已知 library baseline、selection、與 visible stage。
- 保留 asset health、asset references、fallback 行為不退化。

**Non-Goals:**

- 不更動 API schema、playlist governance 規則、或其他 settings 頁。

## Decisions

### Decision 1: Selected-entity refresh first

mutation 後先保留 selected image、selected playlist row、與已知 library baseline，再只刷新受影響 diagnostics。

### Decision 2: Background diagnostics stay outside the editable lane

asset health 與 asset references 是 diagnostics lane，不得在 mutation 完成後把 editable baseline 清空。

### Decision 3: No-regression selection and fallback behavior

selection、caption、fallback、health/reference errors 都必須保留等價可觀察行為。

## Implementation Contract

- Behavior: metadata save、upload、set cover、playlist governance 變更後，頁面 SHALL 保留已知 library 與 selection，再只刷新受影響 diagnostics 或 selected entity payload。
- Interface / data shape: loadModel 與頁面 state 需區分 editable baseline、selected entity、diagnostic refresh lane。
- Failure modes: diagnostics refresh 失敗時，library、selection、與已儲存結果不可回退成 cold blank state。
- Acceptance criteria: mutation-focused tests 需證明 no full cold bootstrap；selection / fallback tests 需證明行為不退化。
- Scope boundaries:
  - In scope: Image Management mutation refresh 邊界。
  - Out of scope: API schema、其他 settings 頁、preview foundation。

## Risks / Trade-offs

- [Risk] targeted refresh 太細會漏掉需要一起更新的 diagnostics。 → Mitigation: 分別用 save、upload、set cover、playlist update tests 固定。
