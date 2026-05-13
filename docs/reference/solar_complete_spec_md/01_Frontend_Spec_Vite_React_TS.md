# Frontend Spec — Vite + React + TypeScript

## 1. 技術選型

- Vite
- React 18+
- TypeScript
- React Router
- TanStack Query 或 SWR
- Zustand 或 Redux Toolkit
- Socket.IO Client 或原生 WebSocket
- Recharts / ECharts，用於歷史資料圖表
- CSS Modules / Tailwind / Styled Components 擇一

建議：若要快速落地並維持設計一致性，可使用 Tailwind + design tokens CSS variables。

## 2. 頁面路由

| Route | 頁面 | 類型 |
|---|---|---|
| `/` | 播放入口，自動導向目前播放頁 | Playback |
| `/overview` | 總覽頁 | Playback |
| `/solar` | 太陽能頁 | Playback |
| `/factory-circuit` | 廠區用電迴路頁 | Playback |
| `/images` | 綠能現場影像頁 | Playback |
| `/sustainability` | 永續成果頁 | Playback |
| `/trends` | 能源趨勢摘要頁 | Data |
| `/settings/playback` | 播放設定 | Admin-like Setting |
| `/settings/images` | 圖片管理 | Admin-like Setting |
| `/settings/mqtt` | 資料來源與 MQTT 設定 | Admin-like Setting |
| `/settings/circuits` | 用電迴路設定 | Admin-like Setting |
| `/device-status` | 裝置狀態詳情 | System |
| `/offline` | 無法取得即時資料 | Error State |

## 3. 前端狀態模型

```ts
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface LiveMetrics {
  realTimePowerKw: number;
  todayGenerationKwh: number;
  totalGenerationKwh: number;
  totalGenerationGwh: number;
  todayCo2ReductionT: number;
  totalCo2ReductionT: number;
  selfConsumptionKwh: number;
  consumptionKwh: number;
  selfConsumptionRatio: number;
  systemEfficiency: number;
  updatedAt: string;
}

export interface CircuitMetric {
  id: string;
  nameZh: string;
  nameEn: string;
  icon: string;
  unit: 'kW' | 'kWh' | '%';
  topic: string;
  value: number;
  percentageOfRatedCapacity: number;
  status: 'normal' | 'attention' | 'warning';
  show: boolean;
}

export interface PlaybackPageConfig {
  key: 'overview' | 'solar' | 'factory-circuit' | 'images' | 'sustainability';
  titleZh: string;
  titleEn: string;
  order: number;
  durationSec: number;
  enabled: boolean;
}
```

## 4. Layout 規格

### Header

固定顯示：

- Logo
- 系統名稱：國瑞汽車中廠綠能展示播放器
- 英文名稱：KUOZUI GREEN ENERGY DISPLAY PLAYER
- 時間
- 日期
- 星期
- 天氣 icon 與溫度，可先以 mock 或 config 表示
- MQTT 狀態 badge

### Footer Navigation

固定顯示：

- 頁碼 chip
- 頁面 nav：Overview / Solar / Factory Circuit / Images / Sustainability / Settings
- slogan：永續，從現在開始 / Sustainability Starts with Us
- 植物裝飾元素

### Main Content

依頁面切換，建議高度：

```css
--header-height: 128px;
--footer-height: 88px;
--content-height: calc(100vh - var(--header-height) - var(--footer-height));
```

## 5. Playback Engine

```ts
interface PlaybackState {
  pages: PlaybackPageConfig[];
  currentPageKey: string;
  autoplay: boolean;
  loop: boolean;
  transitionType: 'fade' | 'slide' | 'none';
  transitionSpeed: 'slow' | 'medium' | 'fast';
  scheduleEnabled: boolean;
  scheduleStart: string; // HH:mm
  scheduleEnd: string;   // HH:mm
  idleMode: 'static-page' | 'black-screen' | 'dimmed';
  idleMinutes: number;
}
```

### 行為

1. 只播放 `enabled = true` 的頁面。
2. 依 `order` 排序。
3. 每頁停留 `durationSec`。
4. 若 MQTT 斷線超過設定秒數，可導向 `/offline`。
5. 若使用者手動切頁，倒數重新開始。
6. 排程外進入待機模式。

## 6. Socket Client

```ts
socket.on('liveMetrics:update', (payload: LiveMetrics) => {
  useMetricsStore.getState().setLiveMetrics(payload);
});

socket.on('circuits:update', (payload: CircuitMetric[]) => {
  useCircuitStore.getState().setCircuits(payload);
});

socket.on('mqtt:status', (status: ConnectionStatus) => {
  useConnectionStore.getState().setStatus(status);
});
```

## 7. Error Handling

| 情境 | 前端行為 |
|---|---|
| MQTT disconnected | Header badge 顯示 Offline，可保留最後值 |
| MQTT timeout | 顯示 Offline Error Display 頁 |
| REST API failed | Toast 或 inline error |
| Socket disconnected | 嘗試重連，Header 顯示 Reconnecting |
| 圖片載入失敗 | 顯示 placeholder |

## 8. Responsive / Display

主目標為 16:9 大螢幕：

- 1920 × 1080
- 1366 × 768 可降級
- Raspberry Pi Chromium kiosk

不建議本版優先支援手機版設定介面，若需要可另開 mobile admin spec。
