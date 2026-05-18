import type {
  BrandProfile,
  ConfigStage,
  DeviceDisplayDiagnosticResult,
  DeviceDisplayOpsSummary,
  DisplayOpsAssetReferenceSummary,
  DisplayOpsSummary,
  DisplayRotationPreview,
  DisplayPageAssetHealthReport,
  DisplayPageFallbackStatus,
  DisplayPageConfigEnvelope,
  DisplayPageKey,
  DisplayReadinessReport,
  ImageAsset,
  PlaybackPage,
  PlaybackSettings,
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

  const apiPort = /^517\d*$/.test(window.location.port) ? "3000" : window.location.port || "3000";
  return `${window.location.protocol}//${window.location.hostname}:${apiPort}${path}`;
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
    throw new Error(rawBody ? extractErrorMessage(rawBody) : `Request failed with status ${response.status}`);
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

export async function getDisplayRotationPreview() {
  const response = await requestJson<{
    preview: DisplayRotationPreview;
  }>("/api/display-pages/rotation-preview");
  return response.preview;
}

export function resolveDisplayPageConfigApiPath(pageId: DisplayPageKey, stage: ConfigStage | "config" = "config") {
  return `/api/display-pages/${pageId}/${stage}`;
}

export async function getDisplayPageConfig(pageId: DisplayPageKey, stage: ConfigStage | "config" = "config") {
  const response = await requestJson<{
    config: DisplayPageConfigEnvelope;
  }>(resolveDisplayPageConfigApiPath(pageId, stage));
  return response.config;
}

export async function updateDisplayPageConfig(
  pageId: DisplayPageKey,
  regions: Record<string, unknown>,
  stage: ConfigStage | "config" = "config"
) {
  const response = await requestJson<{
    config: DisplayPageConfigEnvelope;
  }>(resolveDisplayPageConfigApiPath(pageId, stage), {
    body: JSON.stringify({ regions }),
    method: "PUT"
  });
  return response.config;
}

export async function validateDisplayPageDraft(pageId: DisplayPageKey) {
  const response = await requestJson<{
    validation: ValidationResult;
  }>(`/api/display-pages/${pageId}/validate`, {
    method: "POST"
  });
  return response.validation;
}

export async function publishDisplayPageDraft(pageId: DisplayPageKey, publishedBy?: string) {
  const response = await requestJson<{
    config: DisplayPageConfigEnvelope;
    validation: ValidationResult;
  }>(`/api/display-pages/${pageId}/publish`, {
    body: JSON.stringify({ publishedBy }),
    method: "POST"
  });
  return response;
}

export async function getDisplayPageFallbackStatus(pageId: DisplayPageKey) {
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
  pid: number;
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
