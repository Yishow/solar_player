import type {
  BrandProfile,
  ConfigStage,
  Device,
  DeviceGroup,
  DeviceDisplayDiagnosticResult,
  DeviceDisplayOpsSummary,
  DisplayClientLivenessSnapshot,
  DisplayDataPreview,
  DisplayPreviewContextSelection,
  DisplayPlaybackRuntimeResponse,
  DisplayCardDataResponse,
  DisplayStoryPageId,
  DisplayStoryPagePayload,
  DisplayStoryPayload,
  DisplayPageInstance,
  DisplayOpsAssetReferenceSummary,
  DisplayOpsSummary,
  DisplayRotationPreview,
  DisplayPageAssetHealthReport,
  DisplayPageFallbackStatus,
  DisplayPageConfigEnvelope,
  DisplayPageFreeformObject,
  DisplayPageId,
  DisplayReadinessReport,
  DerivedMetricDefinition,
  DerivedMetricEvaluation,
  FreshnessPolicy,
  ImageAsset,
  ManagementDraftSaveConflict,
  ManagementDraftSavePrecondition,
  MonitoringMetricBinding,
  MetricScope,
  PairingTokenIssue,
  PlaybackPage,
  PlaybackProfileDraft,
  PlaybackProfilePreview,
  PlaybackProfileSummary,
  PlaybackProfileVersion,
  PlaybackSettings,
  ImagePlaylistEntryInput,
  WeatherHeaderContract,
  WeatherDiagnostic,
  WeatherOptionsResponse,
  WeatherSettings,
  ResolvedImagePlaylistEntry,
  SustainabilityPeriodKey,
  SustainabilityPeriodStory,
  SustainabilityStory,
  SustainabilityStoryInput,
  RuntimeBrandProfile,
  RuntimeMqttStatus,
  ValidationResult
} from "@solar-display/shared";
import {
  buildRuntimeApiUrl,
  resolveBrowserApiOrigin as resolveRuntimeBrowserApiOrigin
} from "./runtimeOrigin";
import {
  announceOfflineCacheState,
  cacheOfflineMetricResponse,
  isOfflineMetricPath,
  readOfflineMetricResponse
} from "./offlinePlaybackStore";

export function buildApiUrl(path: string) {
  const env = (
    import.meta as ImportMeta & {
      env?: {
        VITE_API_BASE_URL?: string;
        VITE_PORT?: string;
      };
    }
  ).env;
  return buildRuntimeApiUrl(path, {
    apiBaseUrl: env?.VITE_API_BASE_URL,
    configuredVitePort: env?.VITE_PORT,
    isViteDevServer: isViteDevRuntime(import.meta),
    location: typeof window === "undefined" ? undefined : window.location
  });
}

export function isViteDevRuntime(metaLike: {
  env?: {
    DEV?: boolean;
  };
  hot?: unknown;
}) {
  return Boolean(metaLike.hot) || metaLike.env?.DEV === true;
}

export function resolveBrowserApiOrigin(locationLike: {
  hostname: string;
  port: string;
  protocol: string;
}, configuredVitePort?: string, isViteDevServer = false) {
  return resolveRuntimeBrowserApiOrigin(locationLike, configuredVitePort, isViteDevServer);
}

function extractErrorMessage(rawBody: string) {
  try {
    const parsed = JSON.parse(rawBody) as {
      error?: string;
      message?: string;
    };

    if (typeof parsed.message === "string" && parsed.message.trim().length > 0) {
      return parsed.message;
    }

    if (typeof parsed.error === "string" && parsed.error.trim().length > 0) {
      return parsed.error;
    }
  } catch {
    // fall back to the original response body when it is not JSON
  }

  return rawBody;
}

type ParsedErrorBody = {
  access?: string;
  code?: string;
  conflict?: ManagementDraftSaveConflict<Record<string, unknown>>;
  currentRevision?: number;
  error?: string;
  message?: string;
  requiredRole?: string;
  success?: boolean;
  timestamp?: string;
};

export class ApiRequestError extends Error {
  readonly body: ParsedErrorBody | null;
  readonly statusCode: number;

  constructor(message: string, statusCode: number, body: ParsedErrorBody | null) {
    super(message);
    this.name = "ApiRequestError";
    this.body = body;
    this.statusCode = statusCode;
  }
}

export class ManagementAccessDeniedError extends ApiRequestError {
  constructor(message: string, statusCode: number, body: ParsedErrorBody | null) {
    super(message, statusCode, body);
    this.name = "ManagementAccessDeniedError";
  }
}

export const MANAGEMENT_ACCESS_DENIED_EVENT = "solar:management-access-denied";

export function isManagementAccessDeniedError(error: unknown): error is ManagementAccessDeniedError {
  return error instanceof ManagementAccessDeniedError;
}

export class ManagementDraftConflictError<
  TEnvelope = Record<string, unknown>
> extends ApiRequestError {
  readonly conflict: ManagementDraftSaveConflict<TEnvelope>;

  constructor(
    message: string,
    statusCode: number,
    body: ParsedErrorBody | null,
    conflict: ManagementDraftSaveConflict<TEnvelope>
  ) {
    super(message, statusCode, body);
    this.name = "ManagementDraftConflictError";
    this.conflict = conflict;
  }
}

export function isManagementDraftConflictError(
  error: unknown
): error is ManagementDraftConflictError {
  return error instanceof ManagementDraftConflictError;
}

export class PlaybackProfileDraftConflictError extends ApiRequestError {
  readonly currentRevision: number;

  constructor(
    message: string,
    statusCode: number,
    body: ParsedErrorBody,
    currentRevision: number
  ) {
    super(message, statusCode, body);
    this.name = "PlaybackProfileDraftConflictError";
    this.currentRevision = currentRevision;
  }
}

export function isPlaybackProfileDraftConflictError(
  error: unknown
): error is PlaybackProfileDraftConflictError {
  return error instanceof PlaybackProfileDraftConflictError;
}

function parseErrorBody(rawBody: string): ParsedErrorBody | null {
  try {
    const parsed = JSON.parse(rawBody) as ParsedErrorBody;
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

export async function requestJson<T>(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const method = init?.method ?? "GET";

  if (init?.body !== undefined && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      ...init,
      credentials: "include",
      headers
    });
  } catch (error) {
    if (
      typeof indexedDB !== "undefined"
      && isOfflineMetricPath(path, method)
    ) {
      const cached = await readOfflineMetricResponse<T>(path);
      if (cached !== undefined) {
        announceOfflineCacheState(true);
        return cached;
      }
    }
    throw error;
  }

  if (!response.ok) {
    if (
      response.status >= 500
      && typeof indexedDB !== "undefined"
      && isOfflineMetricPath(path, method)
    ) {
      const cached = await readOfflineMetricResponse<T>(path);
      if (cached !== undefined) {
        announceOfflineCacheState(true);
        return cached;
      }
    }
    const rawBody = await response.text();
    const parsedBody = rawBody ? parseErrorBody(rawBody) : null;
    const message = rawBody ? extractErrorMessage(rawBody) : `Request failed with status ${response.status}`;

    if (
      response.status === 403
      && parsedBody?.access === "denied"
      && parsedBody.code === "management_access_denied"
    ) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(MANAGEMENT_ACCESS_DENIED_EVENT));
      }
      throw new ManagementAccessDeniedError(message, response.status, parsedBody);
    }

    if (
      response.status === 409
      && parsedBody?.code === "management_draft_conflict"
      && parsedBody.conflict
    ) {
      throw new ManagementDraftConflictError(
        message,
        response.status,
        parsedBody,
        parsedBody.conflict
      );
    }

    if (
      response.status === 409
      && parsedBody?.code === "profile_draft_conflict"
      && Number.isInteger(parsedBody.currentRevision)
    ) {
      throw new PlaybackProfileDraftConflictError(
        message,
        response.status,
        parsedBody,
        parsedBody.currentRevision as number
      );
    }

    throw new ApiRequestError(message, response.status, parsedBody);
  }

  const value = (await response.json()) as T;
  if (
    typeof indexedDB !== "undefined"
    && isOfflineMetricPath(path, method)
  ) {
    announceOfflineCacheState(false);
    void cacheOfflineMetricResponse(path, value).catch(() => {
      // Quota or corruption must not turn a successful online response into failure.
    });
  }
  return value;
}

export type ManagementPasswordState = {
  enabled: boolean;
  authenticated: boolean;
  lockedUntil: string | null;
};

export function getManagementPasswordState() {
  return requestJson<ManagementPasswordState>("/api/management-auth/state");
}

export function updateManagementPassword(input: {
  enabled: boolean;
  newPassword?: string;
  currentPassword?: string;
}) {
  return requestJson<{ enabled: boolean; authenticated: boolean }>("/api/management-auth/password", {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

let playbackRuntimeCache: {
  etag: string;
  value: DisplayPlaybackRuntimeResponse;
} | null = null;

export function resetPlaybackRuntimeCacheForTest() {
  playbackRuntimeCache = null;
}

export async function getPlaybackSettings() {
  const response = await requestJson<{
    settings: PlaybackSettings;
  }>("/api/playback/settings");
  return response.settings;
}

export async function getFreshnessPolicy() {
  return requestJson<{ policy: FreshnessPolicy; updatedAt: string }>(
    "/api/freshness-policy"
  );
}

export async function updateFreshnessPolicy(policy: FreshnessPolicy) {
  return requestJson<{ policy: FreshnessPolicy; updatedAt: string }>(
    "/api/freshness-policy",
    {
      body: JSON.stringify(policy),
      method: "PUT"
    }
  );
}

export async function getPlaybackProfiles() {
  const response = await requestJson<{
    data: PlaybackProfileSummary[];
    success: boolean;
  }>("/api/playback-profiles");
  return response.data;
}

export async function createPlaybackProfile(name: string) {
  const response = await requestJson<{
    data: PlaybackProfileSummary;
    success: boolean;
  }>("/api/playback-profiles", {
    body: JSON.stringify({ name }),
    method: "POST"
  });
  return response.data;
}

export async function renamePlaybackProfile(id: number, name: string) {
  const response = await requestJson<{
    data: PlaybackProfileSummary;
    success: boolean;
  }>(`/api/playback-profiles/${id}`, {
    body: JSON.stringify({ name }),
    method: "PUT"
  });
  return response.data;
}

export async function archivePlaybackProfile(id: number) {
  const response = await requestJson<{
    data: PlaybackProfileSummary;
    success: boolean;
  }>(`/api/playback-profiles/${id}/archive`, { method: "POST" });
  return response.data;
}

export async function getPlaybackProfileDraft(id: number) {
  const response = await requestJson<{
    data: PlaybackProfileDraft;
    success: boolean;
  }>(`/api/playback-profiles/${id}/draft`);
  return response.data;
}

export async function savePlaybackProfileDraft(
  id: number,
  input: Pick<PlaybackProfileDraft, "pages" | "settings">
    & { expectedRevision: number }
) {
  const response = await requestJson<{
    data: PlaybackProfileDraft;
    success: boolean;
  }>(`/api/playback-profiles/${id}/draft`, {
    body: JSON.stringify(input),
    method: "PUT"
  });
  return response.data;
}

export async function previewPlaybackProfile(id: number) {
  const response = await requestJson<{
    data: PlaybackProfilePreview;
    success: boolean;
  }>(`/api/playback-profiles/${id}/preview`, { method: "POST" });
  return response.data;
}

export async function publishPlaybackProfile(id: number, expectedRevision: number) {
  const response = await requestJson<{
    data: PlaybackProfileVersion;
    success: boolean;
  }>(`/api/playback-profiles/${id}/publish`, {
    body: JSON.stringify({ expectedRevision }),
    method: "POST"
  });
  return response.data;
}

export async function rollbackPlaybackProfile(
  id: number,
  versionId: number
) {
  const response = await requestJson<{
    data: PlaybackProfileVersion;
    success: boolean;
  }>(`/api/playback-profiles/${id}/rollback`, {
    body: JSON.stringify({ versionId }),
    method: "POST"
  });
  return response.data;
}

export async function getPlaybackProfileVersions(id: number) {
  const response = await requestJson<{
    data: PlaybackProfileVersion[];
    success: boolean;
  }>(`/api/playback-profiles/${id}/versions`);
  return response.data;
}

export type FleetDeviceWrite = {
  clientId?: string;
  displayName?: string;
  enabled?: boolean;
  groupId?: number | null;
};

export type DeviceGroupWrite = {
  enabled?: boolean;
  name?: string;
  playbackProfileId?: number;
  siteScope?: DeviceGroup["siteScope"];
};

export async function getFleetDevices() {
  const response = await requestJson<{ data: Device[]; success: boolean }>(
    "/api/devices"
  );
  return response.data;
}

export async function createFleetDevice(payload: Required<FleetDeviceWrite>) {
  const response = await requestJson<{ data: Device; success: boolean }>(
    "/api/devices",
    {
      body: JSON.stringify(payload),
      method: "POST"
    }
  );
  return response.data;
}

export async function updateFleetDevice(
  id: number,
  payload: FleetDeviceWrite
) {
  const response = await requestJson<{ data: Device; success: boolean }>(
    `/api/devices/${id}`,
    {
      body: JSON.stringify(payload),
      method: "PUT"
    }
  );
  return response.data;
}

export async function getDeviceGroups() {
  const response = await requestJson<{
    data: DeviceGroup[];
    success: boolean;
  }>("/api/device-groups");
  return response.data;
}

export async function createDeviceGroup(
  payload: Required<Pick<DeviceGroupWrite, "enabled" | "name" | "siteScope">>
    & Pick<DeviceGroupWrite, "playbackProfileId">
) {
  const response = await requestJson<{
    data: DeviceGroup;
    success: boolean;
  }>("/api/device-groups", {
    body: JSON.stringify(payload),
    method: "POST"
  });
  return response.data;
}

export async function updateDeviceGroup(
  id: number,
  payload: DeviceGroupWrite
) {
  const response = await requestJson<{
    data: DeviceGroup;
    success: boolean;
  }>(`/api/device-groups/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
  return response.data;
}

export async function issueDevicePairingToken(deviceId: number) {
  const response = await requestJson<{
    data: PairingTokenIssue;
    success: boolean;
  }>(`/api/devices/${deviceId}/pairing-tokens`, {
    method: "POST"
  });
  return response.data;
}

export async function getPlaybackRuntime() {
  const headers = new Headers();
  if (playbackRuntimeCache) {
    headers.set("If-None-Match", playbackRuntimeCache.etag);
  }
  const response = await fetch(buildApiUrl("/api/playback/runtime"), {
    headers
  });
  if (response.status === 304 && playbackRuntimeCache) {
    return playbackRuntimeCache.value;
  }
  if (!response.ok) {
    const rawBody = await response.text();
    const parsedBody = rawBody ? parseErrorBody(rawBody) : null;
    const message = rawBody
      ? extractErrorMessage(rawBody)
      : `Request failed with status ${response.status}`;
    throw new ApiRequestError(message, response.status, parsedBody);
  }
  const value = await response.json() as DisplayPlaybackRuntimeResponse;
  const etag = response.headers.get("etag");
  if (etag) {
    playbackRuntimeCache = { etag, value };
  }
  return value;
}

export async function getDisplayCardData() {
  return requestJson<DisplayCardDataResponse>("/api/display-card-data");
}

export async function saveDisplayCardOverride(
  targetId: string,
  metricScope: MetricScope,
  displayValue: number
) {
  const response = await requestJson<{
    row: DisplayCardDataResponse["rows"][number];
    success: boolean;
  }>(
    `/api/display-card-data/overrides/${encodeURIComponent(targetId)}`,
    {
      body: JSON.stringify({ displayValue, metricScope }),
      method: "PUT"
    }
  );
  return response.row;
}

export async function clearDisplayCardOverride(targetId: string, metricScope: MetricScope) {
  const response = await requestJson<{
    row: DisplayCardDataResponse["rows"][number];
    success: boolean;
  }>(
    `/api/display-card-data/overrides/${encodeURIComponent(targetId)}?metricScope=${encodeURIComponent(metricScope)}`,
    {
      method: "DELETE"
    }
  );
  return response.row;
}

export async function updatePlaybackSettings(settings: Partial<PlaybackSettings>) {
  const response = await requestJson<{
    settings: PlaybackSettings;
  }>("/api/playback/settings", {
    body: JSON.stringify(settings),
    method: "PUT"
  });
  return response.settings;
}

export async function getPlaybackPages() {
  const response = await requestJson<{
    pages: PlaybackPage[];
  }>("/api/playback/pages");
  return response.pages;
}

export async function getDisplayPageRegistry() {
  const response = await requestJson<{
    pages: DisplayPageInstance[];
  }>("/api/display-page-registry");
  return response.pages;
}

export async function createDisplayPageRegistryPage(
  page: Pick<DisplayPageInstance, "displayNameEn" | "displayNameZh" | "routeSlug" | "templateKey">
    & Partial<Pick<DisplayPageInstance, "displayOrder" | "durationSeconds" | "enabled">>
) {
  const response = await requestJson<{
    page: DisplayPageInstance;
  }>("/api/display-page-registry", {
    body: JSON.stringify(page),
    method: "POST"
  });
  return response.page;
}

export async function archiveDisplayPageRegistryPage(pageKey: string) {
  const response = await requestJson<{
    page: DisplayPageInstance;
  }>(`/api/display-page-registry/${pageKey}/archive`, {
    method: "POST"
  });
  return response.page;
}

export async function getDisplayRotationPreview() {
  const response = await requestJson<{
    preview: DisplayRotationPreview;
  }>("/api/display-pages/rotation-preview");
  return response.preview;
}

export function resolveDisplayPageConfigApiPath(pageId: DisplayPageId, stage: ConfigStage | "config" = "config") {
  return `/api/display-pages/${pageId}/${stage}`;
}

export async function getDisplayPageConfig(pageId: DisplayPageId, stage: ConfigStage | "config" = "config") {
  const response = await requestJson<{
    config: DisplayPageConfigEnvelope;
  }>(resolveDisplayPageConfigApiPath(pageId, stage));
  return response.config;
}

export async function getDisplayDataPreview(
  pageId: DisplayPageId,
  context: DisplayPreviewContextSelection,
  stage: ConfigStage = "live"
) {
  const response = await requestJson<{ preview: DisplayDataPreview }>(
    `/api/display-pages/${pageId}/data-preview`,
    {
      body: JSON.stringify({ context, stage }),
      method: "POST"
    }
  );
  return response.preview;
}

export async function updateDisplayPageConfig(
  pageId: DisplayPageId,
  regions: Record<string, unknown>,
  stage: ConfigStage | "config" = "config",
  precondition?: ManagementDraftSavePrecondition,
  freeformObjects: DisplayPageFreeformObject[] = []
) {
  const response = await requestJson<{
    config: DisplayPageConfigEnvelope;
  }>(resolveDisplayPageConfigApiPath(pageId, stage), {
    body: JSON.stringify({
      ...(precondition ?? {}),
      freeformObjects,
      regions
    }),
    method: "PUT"
  });
  return response.config;
}

export async function validateDisplayPageDraft(pageId: DisplayPageId) {
  const response = await requestJson<{
    validation: ValidationResult;
  }>(`/api/display-pages/${pageId}/validate`, {
    method: "POST"
  });
  return response.validation;
}

export async function publishDisplayPageDraft(pageId: DisplayPageId, publishedBy?: string) {
  const response = await requestJson<{
    config: DisplayPageConfigEnvelope;
    validation: ValidationResult;
  }>(`/api/display-pages/${pageId}/publish`, {
    body: JSON.stringify({ publishedBy }),
    method: "POST"
  });
  return response;
}

export async function getDisplayPageFallbackStatus(pageId: DisplayPageId) {
  const response = await requestJson<{
    fallback: DisplayPageFallbackStatus;
  }>(`/api/display-pages/${pageId}/fallback`);
  return response.fallback;
}

export async function getDisplayPageAssetHealth() {
  const response = await requestJson<{
    health: DisplayPageAssetHealthReport;
  }>("/api/display-pages/asset-health");
  return response.health;
}

export async function getDisplayOpsSummary() {
  const response = await requestJson<{
    summary: DisplayOpsSummary;
  }>("/api/display-ops");
  return response.summary;
}

export async function getImageAssetReferences(id: number) {
  const response = await requestJson<{
    references: DisplayOpsAssetReferenceSummary;
  }>(`/api/display-ops/assets/${id}/references`);
  return response.references;
}

export async function getDisplayReadiness() {
  const response = await requestJson<{
    readiness: DisplayReadinessReport;
  }>("/api/display-readiness");
  return response.readiness;
}

export async function fetchDisplayStory() {
  return requestJson<DisplayStoryPayload>("/api/display-story");
}

export async function fetchDisplayStoryPage<PageId extends DisplayStoryPageId>(pageId: PageId) {
  return requestJson<DisplayStoryPagePayload<PageId>>(`/api/display-story/${pageId}`);
}

export async function fetchImagePlaylist(activeIndex = 0) {
  const query = new URLSearchParams({
    activeIndex: String(activeIndex)
  });

  return requestJson<{
    playlist: {
      activeEntry: ResolvedImagePlaylistEntry | null;
      entries: ResolvedImagePlaylistEntry[];
      generatedAt: string;
      hasPlaylistRows: boolean;
      settings: {
        shuffle: boolean;
      };
    };
  }>(`/api/image-playlist?${query.toString()}`);
}

export async function fetchImagePlaylistGovernance() {
  return requestJson<{
    playlist: {
      entries: ImagePlaylistEntryInput[];
      generatedAt: string;
      hasPlaylistRows: boolean;
      resolvedEntries: ResolvedImagePlaylistEntry[];
      settings: {
        shuffle: boolean;
      };
    };
  }>("/api/image-playlist/governance");
}

export async function bootstrapImagePlaylistGovernance() {
  return requestJson<{
    playlist: {
      entries: ImagePlaylistEntryInput[];
      generatedAt: string;
      hasPlaylistRows: boolean;
      resolvedEntries: ResolvedImagePlaylistEntry[];
      settings: {
        shuffle: boolean;
      };
    };
  }>("/api/image-playlist/governance/bootstrap", {
    method: "POST"
  });
}

export type ImageManagementDraftSaveTarget = {
  asset: {
    aspectRatio: number | null;
    description: string | null;
    id: number;
    title: string | null;
  };
  playlistEntry: null | {
    area: string;
    assetId: number | null;
    capturedAt: string;
    description: string;
    displayOrder: number;
    durationSeconds: number;
    enabled: boolean;
    entryId: string;
    fallbackMode: "display-placeholder" | "skip" | "use-cover";
    tags: string[];
    title: string;
  };
};

function normalizeNullableImageManagementText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function updateImagePlaylistEntry(entryId: string, data: Partial<{
  area: string | null;
  assetId: number | null;
  capturedAt: string | null;
  description: string | null;
  displayOrder: number;
  durationSeconds: number;
  enabled: boolean;
  fallbackMode: "display-placeholder" | "skip" | "use-cover";
  tags: string[];
  title: string | null;
}>) {
  return requestJson<{ playlist: unknown }>(
    `/api/image-playlist/${entryId}`,
    { body: JSON.stringify(data), method: "PUT" }
  );
}

export async function updateImagePlaylistSettings(data: { shuffle: boolean }) {
  return requestJson<{
    playlist: {
      settings: {
        shuffle: boolean;
      };
    };
  }>("/api/image-playlist/settings", {
    body: JSON.stringify(data),
    method: "PUT"
  });
}

export async function updateAllImagePlaylistDurations(data: { durationSeconds: number }) {
  return requestJson<{ playlist: unknown }>("/api/image-playlist/duration-all", {
    body: JSON.stringify(data),
    method: "PUT"
  });
}

export async function persistImageManagementDraftTarget(
  target: ImageManagementDraftSaveTarget
) {
  await Promise.all([
    updateImageAsset(target.asset.id, {
      aspectRatio: target.asset.aspectRatio,
      description: target.asset.description,
      title: target.asset.title
    }),
    ...(target.playlistEntry === null
      ? []
      : [
        updateImagePlaylistEntry(target.playlistEntry.entryId, {
          area: normalizeNullableImageManagementText(target.playlistEntry.area),
          assetId: target.playlistEntry.assetId,
          capturedAt: normalizeNullableImageManagementText(target.playlistEntry.capturedAt),
          description: normalizeNullableImageManagementText(target.playlistEntry.description),
          displayOrder: target.playlistEntry.displayOrder,
          durationSeconds: target.playlistEntry.durationSeconds,
          enabled: target.playlistEntry.enabled,
          fallbackMode: target.playlistEntry.fallbackMode,
          tags: target.playlistEntry.tags,
          title: normalizeNullableImageManagementText(target.playlistEntry.title)
        })
      ])
  ]);
}

export async function fetchSustainabilityStory(period?: SustainabilityPeriodKey) {
  const query = period
    ? `?${new URLSearchParams({
      period
    }).toString()}`
    : "";
  return requestJson<{
    story: SustainabilityStory & {
      freshnessPolicy: FreshnessPolicy;
      generatedAt: string;
      period: SustainabilityPeriodStory;
    };
  }>(
    `/api/sustainability-story${query}`
  );
}

export async function getDeviceDisplayOpsSummary() {
  const response = await requestJson<{
    summary: DeviceDisplayOpsSummary;
  }>("/api/device-display-ops");
  return response.summary;
}

export type DeviceReleaseIdentity = {
  available: boolean;
  builtAt: string | null;
  commit: string | null;
  packageVersion: string | null;
  releaseId: string | null;
  schemaVersion: number | null;
  sourceDirty: boolean | null;
  unavailableReason: string | null;
};

export type DeviceTemperatureTelemetry = {
  available: boolean;
  celsius: number | null;
};

export type DeviceFanTelemetry = {
  available: boolean;
  coolingState: number | null;
  rpm: number | null;
  status: "running" | "stopped" | "unavailable";
};

export type DeviceStatusResponseData = {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptimeSeconds: number;
  cpu: { cores: number; loadAvg: [number, number, number] };
  memory: { totalMB: number; usedMB: number; freeMB: number; usePercent: number };
  disk: { totalMB: number; usedMB: number; availableMB: number; usePercent: number };
  temperature: DeviceTemperatureTelemetry;
  fan: DeviceFanTelemetry;
  displayClients: DisplayClientLivenessSnapshot;
  pid: number;
  release?: DeviceReleaseIdentity;
};

export type DeviceLogEntry = {
  message: string;
  priority: string;
  timestamp: string;
};

export type DeviceLogSummary = {
  available: boolean;
  entries: DeviceLogEntry[];
  retention: {
    maxEntries: number;
    scope: "current-boot";
    unit: "solar-display";
  };
  source: "journald";
  unavailableReason: string | null;
};

/** @deprecated Prefer DeviceLogSummary; kept as alias during transition. */
export type DeviceLogExportMetadata = DeviceLogSummary;

export type DeviceKioskExitResult = {
  scheduled: boolean;
  launcherName: string;
  reentryHint: string;
};

export type DataSourceOverviewResponse = {
  generatedAt: string;
  runtimeStorage: {
    status: "ready";
    dataDir: string;
    databasePath: string;
    uploadsDir: string;
    brandUploadsDir: string;
  };
  sqlite: {
    status: "ready" | "degraded" | "unavailable";
    databasePath: string;
    tableCounts: Record<string, number>;
  };
  uploads: {
    status: "ready" | "degraded" | "unavailable";
    imageUploads: {
      status: "ready" | "degraded" | "unavailable";
      dir: string;
      fileCount: number;
      totalBytes: number;
    };
    brandUploads: {
      status: "ready" | "degraded" | "unavailable";
      dir: string;
      fileCount: number;
      totalBytes: number;
    };
  };
  mqtt: {
    status: "ready";
    dataMode: "mqtt" | "mock";
    host: string;
    port: number;
    username: "configured" | "missing";
    password: "configured" | "missing";
  };
  monitoring: {
    anomalyMessages: string[];
    currentDaySnapshotCount?: number;
    hasCurrentDaySnapshots: boolean;
    latestSnapshotAt: string | null;
    latestSnapshotDate: string | null;
    localDate: string;
    metricScope: MetricScope;
    snapshotCount?: number;
  };
  weather: {
    status: "ready";
    cwaAuthorization: "configured" | "missing";
    openDataUrl: string;
    requestTimeoutMs: number;
  };
  retention: {
    status: "ready";
    metricSnapshotRetentionDays: number;
    dailySummaryRetentionDays: number;
    vacuumEnabled: boolean;
  };
  browserLocalCache: {
    status: "browser-managed";
    description: string;
  };
  relatedRoutes: Array<{
    category: "mqtt" | "uploads" | "playback" | "device";
    label: string;
    path: string;
  }>;
  recommendations: Array<{
    description: string;
    status: "recommended";
    title: string;
  }>;
  warnings: string[];
};

export type MonitoringDiagnosticsScope = MetricScope | "all";

export type MonitoringDiagnosticsSummary = {
  anomalyMessages: string[];
  currentDaySnapshotCount: number;
  hasCurrentDaySnapshots: boolean;
  latestSnapshotAt: string | null;
  latestSnapshotDate: string | null;
  localDate: string;
  metricScope: MetricScope;
  snapshotCount: number;
  snapshotSampleLimit: number;
};

export type MonitoringDiagnosticsResponse = {
  generatedAt: string;
  requestedScope: MonitoringDiagnosticsScope;
  summaries: MonitoringDiagnosticsSummary[];
};

export type DataHubEnergyHistoryRange = "day" | "week" | "month" | "year" | "total";

export type DataHubEnergyHistoryResponse = {
  counters: Array<{
    lastUpdated: string | null;
    metricKey: string;
    resetCount: number;
    totalValue: number | null;
  }>;
  metricScope: MetricScope;
  periodSummary?: { quality: string; valueKwh: string | null } | null;
  range: DataHubEnergyHistoryRange;
  snapshots: Array<{
    capturedAt: string;
    co2: number | null;
    consumption: number | null;
    efficiency: number | null;
    generation: number | null;
    ratio: number | null;
    selfConsumption: number | null;
  }>;
  summaries: Array<{
    co2Total: number | null;
    consumptionTotal: number | null;
    date: string;
    generationTotal: number | null;
    peakConsumption: number | null;
    peakConsumptionTime: string | null;
    peakGeneration: number | null;
    peakGenerationTime: string | null;
    selfConsumptionTotal: number | null;
  }>;
};

export type ResetTodayTrendResponse = {
  deletedSnapshots: number;
  metricScope: MetricScope;
  resetAt: string;
  resetDate: string;
};

export type CalculationSettings = {
  carbonEmissionFactor: number;
  co2AutoConvertSmallToKg: boolean;
  estimatedTariffPerKwh: number;
  householdDailyUsageKwh: number;
  householdMonthlyUsageKwh: number;
  treeEquivalentFactor: number;
};

export async function getCalculationSettings() {
  const response = await requestJson<{
    settings: CalculationSettings;
  }>("/api/calculation-settings");
  return response.settings;
}

export async function updateCalculationSettings(settings: CalculationSettings) {
  const response = await requestJson<{
    settings: CalculationSettings;
  }>("/api/calculation-settings", {
    body: JSON.stringify(settings),
    method: "PUT"
  });
  return response.settings;
}

export async function getDerivedMetricDefinitions() {
  const response = await requestJson<{ definitions: DerivedMetricDefinition[] }>(
    "/api/derived-metrics"
  );
  return response.definitions;
}

/**
 * Same endpoint as {@link getDerivedMetricDefinitions}, but keeps the registry
 * diagnostics the response already carries. A surface that resolves the
 * effective metric catalog needs them: a definition the registry failed to
 * compile is excluded server-side, so a catalog built without the diagnostics
 * would offer metrics the server does not accept.
 */
export async function getDerivedMetricRegistrySource() {
  const response = await requestJson<{
    definitions: DerivedMetricDefinition[];
    diagnostics?: Array<{ metricKey: string }>;
  }>("/api/derived-metrics");
  return {
    definitions: response.definitions,
    excludedMetricKeys: new Set((response.diagnostics ?? []).map(({ metricKey }) => metricKey))
  };
}

export async function getDerivedMetricDefinition(metricKey: string, metricScope: MetricScope) {
  return requestJson<{
    definition: DerivedMetricDefinition;
    evaluation: DerivedMetricEvaluation | null;
  }>(
    `/api/derived-metrics/${encodeURIComponent(metricKey)}?scope=${encodeURIComponent(metricScope)}`
  );
}

export async function saveDerivedMetricDefinition(definition: DerivedMetricDefinition) {
  const response = await requestJson<{ definition: DerivedMetricDefinition }>(
    definition.revision > 0
      ? `/api/derived-metrics/${encodeURIComponent(definition.metricKey)}`
      : "/api/derived-metrics",
    {
      body: JSON.stringify(definition),
      method: definition.revision > 0 ? "PUT" : "POST"
    }
  );
  return response.definition;
}

export async function previewDerivedMetricDefinition(
  definition: DerivedMetricDefinition,
  metricScope: MetricScope
) {
  const response = await requestJson<{ evaluation: DerivedMetricEvaluation }>(
    "/api/derived-metrics/preview",
    { body: JSON.stringify({ definition, metricScope }), method: "POST" }
  );
  return response.evaluation;
}

export async function setDerivedMetricEnabled(metricKey: string, enabled: boolean) {
  const response = await requestJson<{ definition: DerivedMetricDefinition }>(
    `/api/derived-metrics/${encodeURIComponent(metricKey)}/enabled`,
    { body: JSON.stringify({ enabled }), method: "PATCH" }
  );
  return response.definition;
}

export async function getDeviceStatus() {
  const response = await requestJson<{
    data: DeviceStatusResponseData;
    success: boolean;
  }>("/api/device/status");
  if (!response.success) {
    throw new Error("載入裝置狀態失敗。");
  }
  return response.data;
}

export async function getDataSourceOverview(metricScope: MetricScope = "global") {
  return requestJson<DataSourceOverviewResponse>(
    `/api/data-source/overview?metricScope=${encodeURIComponent(metricScope)}`
  );
}

export async function getMonitoringDiagnostics(metricScope: MonitoringDiagnosticsScope = "all") {
  return requestJson<MonitoringDiagnosticsResponse>(
    `/api/data-source/monitoring-diagnostics?metricScope=${encodeURIComponent(metricScope)}`
  );
}

export async function getEnergyHistory(
  metricScope: MetricScope,
  range: DataHubEnergyHistoryRange
) {
  const query = new URLSearchParams({
    metricScope,
    range
  });
  return requestJson<DataHubEnergyHistoryResponse>(`/api/data-hub/energy-history?${query.toString()}`);
}

export async function resetTodayTrend(metricScope: MetricScope) {
  const response = await requestJson<{
    data: ResetTodayTrendResponse;
    success: boolean;
  }>("/api/data-source/reset-today-trend", {
    body: JSON.stringify({ metricScope }),
    method: "POST"
  });
  return response.data;
}

export async function resetMonthTrend(metricScope: MetricScope) {
  const response = await requestJson<{
    data: {
      deletedDailySummaries: number;
      deletedSnapshots: number;
      resetAt: string;
      resetMonthStart: string;
    };
    success: boolean;
  }>("/api/data-source/reset-month-trend", {
    body: JSON.stringify({ metricScope }),
    method: "POST"
  });
  return response.data;
}

export async function getDeviceLogs(limit = 20) {
  try {
    const response = await requestJson<{
      data: DeviceLogSummary;
      error?: string;
      success: boolean;
    }>(`/api/device/logs?limit=${encodeURIComponent(String(limit))}`);
    if (!response.data) {
      throw new Error(response.error || "載入裝置日誌失敗。");
    }
    return response.data;
  } catch (error) {
    if (error instanceof ManagementAccessDeniedError) {
      throw error;
    }
    // 503 unavailable envelopes still carry the journald summary for UI truthfulness.
    if (error instanceof ApiRequestError && error.body && typeof error.body === "object") {
      const data = (error.body as { data?: DeviceLogSummary }).data;
      if (data && data.source === "journald") {
        return data;
      }
    }
    throw error instanceof Error ? error : new Error("載入裝置日誌失敗。");
  }
}

/** @deprecated Prefer getDeviceLogs — export is now text/plain download. */
export async function getDeviceLogExportMetadata() {
  return getDeviceLogs(20);
}

export function getDeviceLogExportUrl(limit = 200) {
  return `/api/device/logs/export?limit=${encodeURIComponent(String(limit))}`;
}

export async function runDeviceDisplayDiagnostic(action: "export-summary" | "refresh-readiness") {
  const response = await requestJson<{
    data: DeviceDisplayDiagnosticResult;
    success: boolean;
  }>("/api/device-display-ops/diagnostics", {
    body: JSON.stringify({ action }),
    method: "POST"
  });
  return response.data;
}

export async function runDeviceKioskExit() {
  const response = await requestJson<{
    data: DeviceKioskExitResult;
    success: boolean;
  }>("/api/device/kiosk-exit", {
    method: "POST"
  });
  if (!response.success) {
    throw new Error("離開展示系統失敗。");
  }
  return response.data;
}

export async function updatePlaybackPages(
  pages: Array<Pick<PlaybackPage, "id" | "displayOrder" | "durationSeconds" | "enabled">>
) {
  const response = await requestJson<{
    pages: PlaybackPage[];
  }>("/api/playback/pages", {
    body: JSON.stringify({ pages }),
    method: "PUT"
  });
  return response.pages;
}

export type ImageStorageUsage = {
  fileCount: number;
  usedBytes: number;
  usedMB: number;
};

export async function getImages() {
  const response = await requestJson<{
    data: ImageAsset[];
    success: boolean;
  }>("/api/images");
  return response.data;
}

export async function getImageStorageUsage() {
  const response = await requestJson<{
    data: ImageStorageUsage;
    success: boolean;
  }>("/api/images/storage-usage");
  return response.data;
}

export async function uploadImageAsset(file: File) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("category", "background");
  formData.set("includedInSlideshow", "true");
  formData.set("usageScope", "both");

  const response = await requestJson<{
    data: ImageAsset;
    success: boolean;
  }>("/api/images", {
    body: formData,
    method: "POST"
  });
  return response.data;
}

export async function uploadManagedAsset(
  file: File,
  metadata: {
    category: "background" | "icon" | "object";
    usageScope: "both" | "page-only" | "shell-only";
  }
) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("category", metadata.category);
  formData.set("usageScope", metadata.usageScope);

  const response = await requestJson<{
    data: ImageAsset;
    success: boolean;
  }>("/api/images", {
    body: formData,
    method: "POST"
  });
  return response.data;
}

export async function updateImageAsset(
  id: number,
  data: Partial<
    Pick<
      ImageAsset,
      | "title"
      | "description"
      | "displayDuration"
      | "includedInSlideshow"
      | "isCover"
      | "aspectRatio"
      | "category"
      | "usageScope"
    >
  >
) {
  const response = await requestJson<{
    data: ImageAsset;
    success: boolean;
  }>(`/api/images/${id}`, {
    body: JSON.stringify(data),
    method: "PUT"
  });
  return response.data;
}

export async function deleteImageAsset(id: number) {
  const response = await requestJson<{
    data: { id: number };
    success: boolean;
  }>(`/api/images/${id}`, {
    method: "DELETE"
  });
  return response.data;
}

export type BrandProfileUpdate = Partial<
  Pick<
    BrandProfile,
    | "name"
    | "brandNameZh"
    | "brandNameEn"
    | "productTitleZh"
    | "productTitleEn"
    | "sloganZh"
    | "sloganEn"
  >
>;

export async function getBrandProfiles() {
  const response = await requestJson<{ data: BrandProfile[]; success: boolean }>(
    "/api/brand/profiles"
  );
  return response.data;
}

export async function getRuntimeBrandProfile() {
  const response = await requestJson<{ data: RuntimeBrandProfile; success: boolean }>(
    "/api/brand/profiles/active"
  );
  return response.data;
}

export async function getRuntimeMqttStatus() {
  const response = await requestJson<{ status: RuntimeMqttStatus }>(
    "/api/runtime/mqtt-status"
  );
  return response.status;
}

export async function getHeaderWeatherContract() {
  const response = await requestJson<WeatherHeaderContract>("/api/weather/current");
  return response;
}

export async function getWeatherSettings() {
  const response = await requestJson<{ settings: WeatherSettings }>("/api/weather/settings");
  return response.settings;
}

export async function getWeatherDiagnostics() {
  const response = await requestJson<{ diagnostic: WeatherDiagnostic }>("/api/weather/diagnostics");
  return response.diagnostic;
}

export async function updateWeatherSettings(settings: WeatherSettings) {
  const response = await requestJson<{ settings: WeatherSettings }>("/api/weather/settings", {
    body: JSON.stringify(settings),
    method: "PUT"
  });
  return response.settings;
}

export async function getWeatherOptions(countyName: string | null) {
  const query = countyName ? `?countyName=${encodeURIComponent(countyName)}` : "";
  return requestJson<WeatherOptionsResponse>(`/api/weather/options${query}`);
}

export async function getWeatherPreview(settings: WeatherSettings) {
  return requestJson<WeatherHeaderContract>("/api/weather/preview", {
    body: JSON.stringify(settings),
    method: "POST"
  });
}

export async function createBrandProfile(payload: BrandProfileUpdate & { name: string }) {
  const response = await requestJson<{ data: BrandProfile; success: boolean }>(
    "/api/brand/profiles",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
  return response.data;
}

export async function updateBrandProfile(id: number, payload: BrandProfileUpdate) {
  const response = await requestJson<{ data: BrandProfile; success: boolean }>(
    `/api/brand/profiles/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload)
    }
  );
  return response.data;
}

export async function deleteBrandProfile(id: number) {
  await requestJson<{ data: { id: number }; success: boolean }>(
    `/api/brand/profiles/${id}`,
    { method: "DELETE" }
  );
  return { id };
}

export async function activateBrandProfile(id: number) {
  const response = await requestJson<{ data: BrandProfile; success: boolean }>(
    `/api/brand/profiles/${id}/activate`,
    { method: "POST" }
  );
  return response.data;
}

export async function uploadBrandLogo(
  id: number,
  file: Blob,
  filename: string,
  metadata: { width?: number; height?: number } = {}
) {
  const formData = new FormData();
  formData.set("file", file, filename);
  if (metadata.width) formData.set("width", String(metadata.width));
  if (metadata.height) formData.set("height", String(metadata.height));
  const response = await requestJson<{ data: BrandProfile; success: boolean }>(
    `/api/brand/profiles/${id}/logo`,
    {
      method: "POST",
      body: formData
    }
  );
  return response.data;
}

export async function deleteBrandLogo(id: number) {
  const response = await requestJson<{ data: BrandProfile; success: boolean }>(
    `/api/brand/profiles/${id}/logo`,
    { method: "DELETE" }
  );
  return response.data;
}

export function brandLogoUrl(profile: BrandProfile): string {
  return profile.logoUrl ? buildApiUrl(profile.logoUrl) : "/brand-logo.png";
}
