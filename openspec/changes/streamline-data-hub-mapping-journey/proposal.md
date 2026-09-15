# 從收到的資料到可用來源：三階段引導

## Why

既有 M2 要求 integrated three-stage onboarding、visual field selection、canonical preview 與 versioned apply；目前上層 GuidedOnboardingPanel 仍以 connection/site/received-data/confirm 呈現，並把實際發佈放在確認階段，發送目標還固定使用 consumptionEnergy。新的介面應把已有的正確後端契約完整露出，不再增加另一套四步或測試等於發送的心智模型。

## What Changes

- 已有授權連線時，預設三階段：選資料 → 選值並確認意義 → 預覽與套用。
- 缺連線／廠區／approved scope 作為原地 prerequisite，不讓正常流程重填。
- 大型解析與批次以完整工作區呈現，沿用 A/B 的回到來源脈絡。
- preview/apply 使用現有 canonicalDraft、previewToken、idempotency 與 revision 契約。
- 把實際 MQTT 發佈移至可選進階診斷，任何目標來自所選／已保存來源，不寫死 metricKey。

## Capabilities

### New Capabilities
無。

### Modified Capabilities
- `guided-mqtt-tag-mapping`：深化既有 M2-R1；補足階段進度、審查差異、完成與測試分離的 UX。

## Impact

GuidedOnboardingPanel、GuidedMqttMappingPanel、Sources/TaskHome entry、既有 preview/apply 與 publish-confirmation 呼叫。不得重寫 E1/E2/E6 算法與歷史，也不得用前端自行拼出的 mutable form 取代 server canonicalDraft。

## Non-goals

不承諾三次點擊接好任意數量電錶；不自動猜單位／主錶／分母；不讓預覽更新正式讀值；不新增未支援的 codec 或 JSONPath 執行功能。

## 2026-09-15 跨發布端審查更新

本輪基準為 `fd405ebc2957232b6c622071622b9c7d830a3a42`。本 change 仍是未實作提案，不勾選產品驗收、不歸檔。與本輪新增的 `plan-power-mqtt-publishing-and-kn-onboarding` 共用 [MQTT-OWNERSHIP](../../../docs/plans/data-hub-reception-ux/MQTT-OWNERSHIP.md) 與 [PUBLISH-TAG-REGISTER](../../../docs/plans/data-hub-reception-ux/PUBLISH-TAG-REGISTER.md)。

Solar 已託管資料直接重用；電力 raw 與 virtual 不能重複入帳。新版電力封包須先經 F 的有界驗證，再沿用 M2/E1；觀音預留 tag 不可直接套用。

## 2026-09-16 工程別修訂（取代舊 KN 逐錶前提）

三階段先選sourceKind/mode，再走工程preview/period/版本，不要求meterId。不將已算好日量再差分；G共用gate及typed provider就緒前不可fallback。

觀音結果契約由 [`add-kn-engineering-mqtt-sources`](../add-kn-engineering-mqtt-sources/proposal.md) 的 KNE/EPR 要求負責；本文件舊段落中的 DDE/physical/raw 與 F v1 前置僅適用明確選擇的物理來源，不得套成工程別必要條件。A 的焦點、B 的路由、C 的連線責任、D 的預覽及 E 的配置安全依原規格保留。需要逐來源核對的是工程成果模式與涵蓋範圍，不是上游每顆錶。
