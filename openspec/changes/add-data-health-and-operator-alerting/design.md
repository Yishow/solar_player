## Context

Freshness policy 已能判斷來源是否過期；MQTT/device services 也會發 system error/recovered，但事件沒有統一 persistence、dedupe、acknowledge 或 trend annotation。部分累積 counter 已追蹤 reset count，卻沒有 operator-facing timeline。此 change 將既有可觀測訊號組成一個 domain event layer，而非再建第二套監控真相。

## Goals / Non-Goals

**Goals:**

- 讓 operator 一眼看到目前有哪些資料/來源異常，以及何時開始、是否恢復。
- 規則可解釋且測試可重現，不因正常夜間 0 kW 等情境大量誤報。
- 同一事件持續期間只更新同一 open event，不每分鐘洗版。
- Trend/History 能用同一 event timeline 說明資料跳變。
- Alert Center 可 acknowledge/mute，但不刪掉事實歷史。

**Non-Goals:**

- 不做 predictive maintenance/AI anomaly model。
- 不讓 acknowledge 改變資料 freshness/readiness 真相。
- 不把 raw MQTT payload 或 secrets存進 alert event。

## Decisions

### Health rules 以既有 provenance 與 category 為基礎

第一版規則：

1. `stale/missing`：直接使用 authoritative freshness/readiness結果。
2. `cumulative-reset`：counter value下降或 reset_count增加時產生一次 event。
3. `jump`：由 per-metric/category 可配置最大 delta/rate判斷，預設只對有明確尺度的累積/功率 metrics啟用。
4. `stuck`：只對明確 opt-in rule profile啟用，且要求 source timestamp持續前進但 value在設定窗口內不變；solar/nighttime 0 等 expected-zero window可停用該規則。

不以「數字沒變」直接全域判定異常，避免夜間太陽能等正常狀態誤報。

### 事件 lifecycle 以 deterministic fingerprint 去重

Persist `health_events`/generic `monitoring_events`，核心欄位包含 event type、domain、source key、severity、openedAt、lastObservedAt、recoveredAt、state、bounded safe details、source provenance。相同 fingerprint在 active期間只更新 lastObservedAt；條件恢復後標 recovered。新一輪再異常建立新 event。

### Alert Center 是事件視圖，不是第二套狀態機

Alert Center 查詢 active/recent events並疊加 operator acknowledgement/mute metadata。Acknowledge只表示「有人看過」，mute只抑制通知呈現/外部 delivery；不改 health event state。

### Trend annotations 使用同一 server timeline

Energy Trend/History API接受時間範圍，回傳同窗的 monitoring events；web 將它們畫為垂直 marker/annotation。設定稽核 change完成後，其重要 config event可透過 adapter加入 timeline，不在這裡複製 audit資料。

### 外部投遞採 adapter，第一階段不假裝有 provider

定義 delivery channel/preferences與 `pending/sent/failed` receipt模型，但必做 UI channel只有 in-app。未安裝/設定 provider時 Email/LINE 顯示 unavailable，不建立假 success。後續可獨立 change實作 provider。

## Implementation Contract

- 同一 MQTT stale條件連續 30 次評估只維持一個 open event；恢復後標 recovered。
- cumulative reset只在 reset edge建立 event，不因新基準後續每次 polling重複建立。
- expected nighttime solar zero不被 default stuck rule告警。
- alert details不得含 broker password、CWA token、raw credential/header、stack trace。
- acknowledge/mute不影響 readiness/freshness結果。
- Trend/History range query只回該時間窗必要的 bounded annotations。

## Migration Plan

新增 event/ack schema與 indexes；初始不回填歷史 anomalies，避免用缺少當時 context的資料猜測。部署後開始累積。Retention先採明確 bounded policy，例如 active事件保留、recovered事件依 operator event retention清理；具體天數放 config/default並測試。

## Risks / Trade-offs

- [Risk] 規則太敏感造成 alert fatigue → 除 stale/reset 外，jump/stuck採 category defaults與 opt-in tuning，UI顯示 rule來源。
- [Risk] event量成長 → fingerprint dedupe、range index與 retention。
- [Risk] 多個頁面對同一問題發出重複事件 → server在 domain event層 dedupe，UI只做 projection。
