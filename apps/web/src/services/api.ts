import type {
  BrandProfile,
  ConfigStage,
  DeviceDisplayDiagnosticResult,
  DeviceDisplayOpsSummary,
  DisplayClientLivenessSnapshot,
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
  ImageAsset,
  ManagementDraftSaveConflict,
  ManagementDraftSavePrecondition,
  MonitoringMetricBinding,
  PlaybackPage,
  PlaybackSettings,
  ImagePlaylistEntryInput,
  WeatherHeaderContract,
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

export function buildApiUrl(path: string) {
  const configuredBaseUrl = (
    import.meta as ImportMeta & {
      env?: {
        VITE_API_BASE_URL?: string;
      };
    }
  ).env?.VITE_API_BASE_URL;

  if (configuredBaseUrl) {
    return `${configuredBaseUrl}${path}`;
  }

  if (typeof window === "undefined") {
    return `http://localhost:3000${path}`;
  }

  return `${resolveBrowserApiOrigin(window.location)}${path}`;
}

function isLoopbackHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();
  return normalizedHostname === "localhost" || normalizedHostname === "127.0.0.1" || normalizedHostname === "::1";
}

export function resolveBrowserApiOrigin(locationLike: {
  hostname: string;
  port: string;
  protocol: string;
}) {
  const isViteDevPort = /^517\d*$/.test(locationLike.port);

  if (isViteDevPort && !isLoopbackHostname(locationLike.hostname)) {
    return `${locationLike.protocol}//${locationLike.hostname}:${locationLike.port}`;
  }

  const apiPort = isViteDevPort ? "3000" : locationLike.port || "3000";
  return `${locationLike.protocol}//${locationLike.hostname}:${apiPort}`;
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

  if (init?.body !== undefined && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers
  });

  if (!response.ok) {
    const rawBody = await response.text();
    const parsedBody = rawBody ? parseErrorBody(rawBody) : null;
    const message = rawBody ? extractErrorMessage(rawBody) : `Request failed with status ${response.status}`;

    if (
      response.status === 403
      && parsedBody?.access === "denied"
      && parsedBody.code === "management_access_denied"
    ) {
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

    throw new ApiRequestError(message, response.status, parsedBody);
  }

  return (await response.json()) as T;
}

export async function getPlaybackSettings() {
  const response = await requestJson<{
    settings: PlaybackSettings;
  }>("/api/playback/settings");
  return response.settings;
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
  return requestJson<{ story: SustainabilityStory & { generatedAt: string; period: SustainabilityPeriodStory } }>(
    `/api/sustainability-story${query}`
  );
}

export async function getDeviceDisplayOpsSummary() {
  const response = await requestJson<{
    summary: DeviceDisplayOpsSummary;
  }>("/api/device-display-ops");
  return response.summary;
}

export type DeviceStatusResponseData = {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptimeSeconds: number;
  cpu: { cores: number; loadAvg: [number, number, number] };
  memory: { totalMB: number; usedMB: number; freeMB: number; usePercent: number };
  disk: { totalMB: number; usedMB: number; availableMB: number; usePercent: number };
  displayClients: DisplayClientLivenessSnapshot;
  pid: number;
};

export type DeviceLogExportMetadata = {
  directory: string;
  files: string[];
};

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

export async function getDeviceLogExportMetadata() {
  const response = await requestJson<{
    data: DeviceLogExportMetadata;
    success: boolean;
  }>("/api/device/logs/export");
  if (!response.success) {
    throw new Error("載入裝置日誌失敗。");
  }
  return response.data;
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
      "title" | "description" | "displayDuration" | "includedInSlideshow" | "isCover" | "aspectRatio"
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
