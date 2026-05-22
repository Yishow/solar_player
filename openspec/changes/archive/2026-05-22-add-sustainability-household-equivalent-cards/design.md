## Context

業主要在輪播展示中用 4 口之家電費換算強化綠化與節能方向，且希望以兩張卡分別表達今日綠電效益與累積綠能成果。現有 Sustainability story 雖然已有 cumulative counters、daily summaries、big numbers 與 highlights，但這些輸出仍以原始能源/減碳指標為主，沒有「家庭電費等價」的正式資料模型、假設口徑或 fallback contract。

這個 change 要補的是 household-equivalent template 的語意與資料來源，讓前台能呈現 `X 戶4口之家` 的生活化敘事，同時保留估算依據與不可用狀態。它依賴 card rail contract 已經存在，但不負責 editor card CRUD 或任意版面編排。

## Goals / Non-Goals

**Goals:**

- 為 Sustainability 定義 household-equivalent 卡片模板與可持久化內容欄位。
- 以 measured runtime data 推導今日與累積兩張 4 口之家等價卡，而不是手填死數字。
- 把四口之家平均用電與估算電價假設納入正式 metadata，讓前台能顯示 disclaimer 與來源狀態。
- 讓預設 Sustainability rail 可以直接帶出兩張 household-equivalent cards，但 headline 仍以戶數為主而不是金額。

**Non-Goals:**

- 不在本 change 內交付 editor 的新增、刪除、拖拉、模板切換 UI。
- 不把 household-equivalent 做成全站通用計價/報表系統，也不新增任意費率引擎。
- 不讓金額成為前台主視覺，也不在本 change 內新增可編輯複雜費率表單。
- 不修改 Sustainability 的 period chip 模型為 day/month/cumulative 任意混搭模式。

## Decisions

### Derive electricity-bill equivalence from self-consumption-based savings

4 口之家電費等價 SHALL 以可實際折抵電費的自發自用量為主，而不是直接用總發電量估算。今日卡使用 daily summary 的 `self_consumption_total`，累積卡使用 cumulative counter 的 `selfConsumption`；再乘上 calc profile 中的估算電價，最後換算成相當於多少戶 4 口之家的一日或一個月電費。

替代方案是直接用總發電量當作省電費基礎。那會把未自用或未折抵帳單的能量也算進 headline，對外說服力較弱，因此不採用。

### Carry calculation assumptions as first-class household-equivalent metadata

household-equivalent 模板 SHALL 帶有 calcProfile、disclaimer、source label、sync state 與 generated-at metadata。前台 headline 可以只顯示 `X 戶4口之家`，但卡片底部或 provenance block 必須能指出這是依四口之家平均用電與估算電價換算而來。

替代方案是只回傳一個整數 householdCount，完全不保留口徑。這會讓數字在前台看似漂亮卻無法解釋來源，後續也難以校正，因此不採用。

### Seed Sustainability with two default household-equivalent cards while keeping currency secondary

Sustainability 預設 SHALL 建立兩張 household-equivalent 卡：`今日綠電效益` 與 `累積綠能成果`。兩張卡都以 `X 戶4口之家` 為 headline，說明句分別對應 `約可折抵一日電費` 與 `約相當於一個月電費`；即使内部計算經過電價，也不把金額作為主顯示欄位。

替代方案是直接顯示 `NT$` 金額，或把同一張卡在不同狀態間自動切字。這都會弱化「4 口之家」這個業主指定的感知鉤子，因此不採用。

### Fail closed when the equivalence basis is unavailable

若 daily summary 或 cumulative self-consumption 缺漏，household-equivalent 卡 SHALL 顯示 unavailable/placeholder state 與資料不足原因，而不是悄悄退回另一種較寬鬆的估算基礎。這讓對外敘事寧可保守，也不把無法驗證的電費節省講成既定事實。

替代方案是當自發自用量缺漏時退回總發電量或手寫 fallback 文案。這會讓同一張卡在不同環境下代表不同數學意義，因此不採用。

## Implementation Contract

- **Behavior**: Sustainability card rail SHALL 能呈現兩張 derived household-equivalent cards，分別代表今日自發自用折抵的一日電費等價，以及累積自發自用折抵的一個月電費等價。若資料不足，卡片 SHALL 顯示 unavailable state 與估算依據，而不是顯示未註明來源的戶數。
- **Interface / data shape**: shared household-equivalent contract SHALL 至少包含 template key、eyebrow、householdCount display、householdLabel、supportingLine、calcProfile、disclaimer、source/provenance metadata，以及 derived status。server route 或 story service SHALL 提供這些欄位給 Sustainability runtime；其中 calc profile SHALL 描述四口之家平均用電與估算電價，而不是硬編碼在 JSX 文案中。
- **Failure modes**: 缺少 daily self-consumption 或 cumulative selfConsumption 時，對應卡片 SHALL 標記為 unavailable 或 fallback reason，而不是默默使用 generation。未知 calcProfile SHALL 阻止 derived result 被視為 valid headline，並保留可診斷的 metadata。
- **Acceptance criteria**:
  - `spectra validate --strict --changes add-sustainability-household-equivalent-cards` 通過。
  - server/service tests 可證明 derived result 來自 daily summary 與 cumulative selfConsumption，而不是總發電量。
  - Sustainability view model/render tests 可證明兩張預設 household-equivalent cards 以 `X 戶4口之家` 為 headline 並保留 disclaimer。
  - 缺資料時的 unavailable contract 有對應測試覆蓋。
- **Scope boundaries**:
  - In scope: household-equivalent template、calc profile metadata、derived today/cumulative card values、Sustainability 預設兩張卡、provenance/disclaimer/fallback。
  - Out of scope: editor CRUD/drag UI、全站各種 tariff engine、多頁同時導入、金額 headline 顯示。

## Risks / Trade-offs

- [Risk] 以估算電價換算戶數仍會被質疑精準度。 → Mitigation: 把 calc profile 與 disclaimer 作為正式 metadata，而不是隱藏假設。
- [Risk] self-consumption 缺資料時卡片可能經常 unavailable。 → Mitigation: 明確 fail-closed，並在 proposal scope 內記錄這是可接受的保守策略。
- [Risk] 若 derived logic 散落在 view model 與 service，後續校正口徑會更難。 → Mitigation: 把 household equivalence 計算收斂到 shared helper / service contract。
