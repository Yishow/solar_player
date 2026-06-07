import type { DisplayPageTemplateKey } from "./displayPageConfig.js";

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
  | "systemEfficiency"
  | "factoryProductionPower"
  | "factoryHvacPower"
  | "factoryLightingPower"
  | "factoryOfficePower"
  | "factoryEvGreenPower"
  | "factoryInfrastructurePower"
  | "phaseRVoltage"
  | "phaseRCurrent"
  | "phaseRPower"
  | "phaseSVoltage"
  | "phaseSCurrent"
  | "phaseSPower"
  | "phaseTVoltage"
  | "phaseTCurrent"
  | "phaseTPower";

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
  displaySlot?: string | null;
  enabled: boolean;
}

export interface PlaybackSettings {
  autoplay: boolean;
  loop: boolean;
  startPage: number;
  transitionType: PlaybackTransitionType;
  transitionSpeed: number;
  scheduleEnabled: boolean;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  repeatDays: number[];
  idleMode: PlaybackIdleMode;
  idleTimeout: number;
  brightness: number;
  orientation: PlaybackOrientation;
  updatedAt: string | null;
}

export type PlaybackTransitionType = "fade" | "slide" | "none";
export type PlaybackIdleMode = "disabled" | "return-to-start";
export type PlaybackOrientation = "landscape" | "portrait";

export interface PlaybackPage {
  id: number;
  pageKey: string;
  templateKey?: DisplayPageTemplateKey;
  route: string;
  labelZh: string;
  labelEn: string;
  enabled: boolean;
  displayOrder: number;
  durationSeconds: number;
}

export interface PlaybackSettingsUpdatedEvent {
  source: "pages" | "settings";
  pages?: PlaybackPage[];
  settings?: PlaybackSettings;
}

export const managedAssetCategories = ["background", "object", "icon"] as const;
export type ManagedAssetCategory = (typeof managedAssetCategories)[number];

export const managedAssetUsageScopes = ["both", "page-only", "shell-only"] as const;
export type ManagedAssetUsageScope = (typeof managedAssetUsageScopes)[number];

export interface ImageAssetUsageSummary {
  draftCount: number;
  liveCount: number;
  referenceCount: number;
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
  category?: ManagedAssetCategory;
  usageScope?: ManagedAssetUsageScope;
  usageSummary?: ImageAssetUsageSummary;
  seedKey?: string | null;
}

export interface BrandProfile {
  id: number;
  name: string;
  brandNameZh: string;
  brandNameEn: string;
  productTitleZh: string;
  productTitleEn: string;
  sloganZh: string;
  sloganEn: string;
  logoFilename: string | null;
  logoMimeType: string | null;
  logoWidth: number | null;
  logoHeight: number | null;
  logoFileSize: number | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
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
