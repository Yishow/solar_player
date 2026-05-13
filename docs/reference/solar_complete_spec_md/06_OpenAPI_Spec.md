# OpenAPI Spec — REST API Design

## 1. API 原則

- Base URL: `/api`
- Content-Type: `application/json`
- 圖片上傳使用 `multipart/form-data`
- 不使用登入與權限
- 所有日期時間使用 ISO 8601
- 錯誤回應格式一致

## 2. 通用錯誤格式

```ts
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

## 3. Endpoint Summary

### Metrics

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/metrics/live` | 取得目前即時能源資料 |
| GET | `/api/metrics/history` | 取得歷史曲線資料 |
| GET | `/api/metrics/daily-summary` | 取得每日彙總 |
| GET | `/api/metrics/cumulative` | 取得累積值 |
| POST | `/api/metrics/cumulative/reset` | 重置累積值，預設不建議開啟 |

### MQTT Settings

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/settings/mqtt` | 取得 MQTT 設定 |
| PUT | `/api/settings/mqtt` | 更新 MQTT 設定 |
| POST | `/api/settings/mqtt/test` | 測試 MQTT 連線 |
| GET | `/api/settings/mqtt/topics` | 取得 topic mapping |
| PUT | `/api/settings/mqtt/topics` | 更新 topic mapping |

### Circuits

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/circuits` | 取得迴路設定與即時值 |
| POST | `/api/circuits` | 新增迴路 |
| PUT | `/api/circuits/{id}` | 更新迴路 |
| DELETE | `/api/circuits/{id}` | 刪除迴路 |
| PUT | `/api/circuits/reorder` | 更新排序 |

### Images

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/images` | 取得圖片清單 |
| POST | `/api/images` | 上傳圖片 |
| PUT | `/api/images/{id}` | 更新圖片 metadata |
| DELETE | `/api/images/{id}` | 刪除圖片 |
| PUT | `/api/images/reorder` | 圖片排序 |

### Playback

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/playback/settings` | 取得播放設定 |
| PUT | `/api/playback/settings` | 更新播放設定 |
| GET | `/api/playback/pages` | 取得播放頁設定 |
| PUT | `/api/playback/pages` | 更新播放頁設定 |
| POST | `/api/playback/current-page` | 手動切換目前頁面 |

### Device

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/device/status` | 裝置狀態 |
| POST | `/api/device/reboot` | 重新啟動裝置 |
| POST | `/api/device/clear-cache` | 清除快取 |
| POST | `/api/device/update` | 執行系統更新 |
| GET | `/api/device/logs` | 匯出或查詢 log |

## 4. OpenAPI 產出方式

Fastify 建議使用：

```ts
await app.register(swagger, {
  openapi: {
    openapi: '3.1.0',
    info: {
      title: 'Kuozui Green Energy Display API',
      version: '1.0.0'
    }
  }
});

await app.register(swaggerUi, {
  routePrefix: '/docs'
});
```

## 5. Query Example

```txt
GET /api/metrics/history?metricKeys=power,generation,consumption&range=day&interval=30m
```

Response:

```json
{
  "range": "day",
  "interval": "30m",
  "series": [
    {
      "metricKey": "power",
      "unit": "kW",
      "points": [
        { "timestamp": "2025-05-26T00:00:00+08:00", "value": 0 },
        { "timestamp": "2025-05-26T12:00:00+08:00", "value": 1280 }
      ]
    }
  ]
}
```
