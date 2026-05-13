import type { ImageAsset, PlaybackPage, PlaybackSettings } from "@solar-display/shared";

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

  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    headers,
    ...init
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
  data: Partial<Pick<ImageAsset, "title" | "description" | "displayDuration" | "includedInSlideshow" | "isCover">>
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
