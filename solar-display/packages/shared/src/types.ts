export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export type MetricKey =
  | "realTimePower"
  | "todayGeneration"
  | "totalGeneration"
  | "todayCo2Reduction"
  | "totalCo2Reduction"
  | "selfConsumptionEnergy"
  | "consumptionEnergy"
  | "selfConsumptionRatio"
  | "systemEfficiency";

export interface MqttTopicMapping {
  id: number;
  metricKey: string;
  topic: string;
  unit: string | null;
  valuePath: string | null;
  multiplier: number;
  offset: number;
  decimalPlaces: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CircuitConfig {
  id: number;
  nameZh: string | null;
  nameEn: string | null;
  icon: string | null;
  unit: string | null;
  mqttTopic: string | null;
  ratedCapacity: number | null;
  normalMin: number | null;
  normalMax: number | null;
  attentionMin: number | null;
  attentionMax: number | null;
  warningMin: number | null;
  warningMax: number | null;
  displayOrder: number | null;
  enabled: boolean;
}

export interface PlaybackSettings {
  autoplay: boolean;
  loop: boolean;
  startPage: number;
  transitionType: string;
  transitionSpeed: number;
  scheduleEnabled: boolean;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  repeatDays: string | null;
  idleMode: boolean;
  idleTimeout: number;
  brightness: number;
  orientation: string;
}

export interface ImageAsset {
  id: number;
  filename: string | null;
  originalName: string | null;
  title: string | null;
  description: string | null;
  mimeType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  includedInSlideshow: boolean;
  isCover: boolean;
  displayDuration: number;
  displayOrder: number | null;
}

export interface DeviceStatus {
  mqttStatus: "connected" | "connecting" | "stale" | "offline" | "error";
  lastMessageTime: string | null;
  localIp: string | null;
  cpuUsage: number | null;
  memoryUsage: number | null;
  diskUsage: number | null;
  temperature: number | null;
  uptime: number | null;
  os: string | null;
  appVersion: string | null;
}
