import type { PlaybackProfileSummary } from "./deviceIdentity.js";
import type { PlaybackPage, PlaybackSettings } from "./types.js";

export type { PlaybackProfileSummary } from "./deviceIdentity.js";

export type PlaybackProfileSnapshot = {
  pages: PlaybackPage[];
  settings: PlaybackSettings;
};

export type PlaybackProfileDraft = PlaybackProfileSnapshot & {
  profileId: number;
  revision: number;
  updatedAt: string;
};

export type PlaybackProfileVersion = {
  createdAt: string;
  createdBy: string;
  id: number;
  profileId: number;
  rollbackFromVersionId: number | null;
  schemaVersion: 1;
  snapshot: PlaybackProfileSnapshot;
  versionNumber: number;
};

export type PlaybackProfilePreviewPage = PlaybackPage & {
  detail: string | null;
  skipReason: string;
};

export type PlaybackProfileSitePreview = {
  configured: PlaybackPage[];
  diagnostics: {
    fallback: string[];
    freshness: string[];
    readiness: string[];
    site: string[];
  };
  effective: PlaybackPage[];
  siteScope: "cl" | "kn";
  skipped: PlaybackProfilePreviewPage[];
};

export type PlaybackProfilePreview = {
  cl: PlaybackProfileSitePreview;
  kn: PlaybackProfileSitePreview;
  profileId: number;
  revision: number;
};
