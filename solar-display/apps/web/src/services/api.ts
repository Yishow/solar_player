import type { PlaybackPage, PlaybackSettings } from "@solar-display/shared";

export function buildApiUrl(path: string) {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (configuredBaseUrl) {
    return `${configuredBaseUrl}${path}`;
  }

  if (typeof window === "undefined") {
    return `http://localhost:3000${path}`;
  }

  const apiPort = window.location.port === "5173" ? "3000" : window.location.port || "3000";
  return `${window.location.protocol}//${window.location.hostname}:${apiPort}${path}`;
}

export async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
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
