import type { MetricScope } from "./metricScope.js";

export type SourceMappingConfiguration = {
  decimalPlaces?: number;
  enabled: boolean;
  metricKey: string;
  metricScope: MetricScope;
  multiplier: number;
  nameEn: string | null;
  nameZh: string | null;
  offset?: number;
  topic: string;
  unit: string;
  valuePath: string;
};

export type SingleSourceMutationPatch = {
  decimalPlaces?: number;
  enabled?: boolean;
  metricKey?: string;
  metricScope?: MetricScope;
  multiplier?: number;
  nameEn?: string | null;
  nameZh?: string | null;
  offset?: number;
  topic?: string;
  unit?: string;
  valuePath?: string;
};

export type SingleSourceMutationRequest = {
  expectedRevision: number;
  idempotencyKey?: string;
  patch: SingleSourceMutationPatch;
};

export type SingleSourceDeleteRequest = {
  expectedRevision: number;
  idempotencyKey?: string;
};

export type SingleSourceCreateRequest = {
  idempotencyKey?: string;
  source: SourceMappingConfiguration;
};

export type SingleSourceMutationResponse = {
  configuration: SourceMappingConfiguration;
  persistence: "committed";
  revision: number;
  runtime: "active" | "pending" | "failed" | "unchanged";
  sourceRef: string;
  success: true;
  timestamp: string;
};

export type SingleSourceDeleteResponse = {
  deleted: true;
  persistence: "committed";
  runtime: "active" | "pending" | "failed" | "unchanged";
  sourceRef: string;
  success: true;
  timestamp: string;
};

export type DataHubCapabilities = {
  legacyReplaceSupported: boolean;
  versionedSourceEditing: boolean;
};
