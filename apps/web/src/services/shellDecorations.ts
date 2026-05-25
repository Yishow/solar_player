import type {
  PublicShellDecorationConfig,
  ShellDecorationChannel,
  ShellDecorationEnvelope,
  ValidationResult
} from "@solar-display/shared";
import { requestJson } from "./api";

export async function getPublicShellDecorations() {
  const response = await requestJson<{ config: PublicShellDecorationConfig }>("/api/shell-decorations");
  return response.config;
}

export async function getShellDecorationDraft() {
  const response = await requestJson<{ config: ShellDecorationEnvelope }>("/api/shell-decorations/draft");
  return response.config;
}

export async function saveShellDecorationDraft(channel: ShellDecorationChannel, baseVersion: number) {
  const response = await requestJson<{ config: ShellDecorationEnvelope }>("/api/shell-decorations/draft", {
    body: JSON.stringify({ ...channel, baseVersion }),
    method: "PUT"
  });
  return response.config;
}

export async function getShellDecorationLive() {
  const response = await requestJson<{ config: ShellDecorationEnvelope }>("/api/shell-decorations/live");
  return response.config;
}

export async function publishShellDecorations(publishedBy?: string) {
  return requestJson<{ config: ShellDecorationEnvelope; validation: ValidationResult }>(
    "/api/shell-decorations/publish",
    {
      body: JSON.stringify({ publishedBy }),
      method: "POST"
    }
  );
}
