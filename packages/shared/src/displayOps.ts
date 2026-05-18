import type { DisplayPageKey } from "./displayPageConfig.js";
import type { DisplayRotationSkipReason } from "./displayRotation.js";

export type DisplayOpsIssueCode =
  | "asset-unhealthy"
  | "data-not-ready"
  | "draft-pending"
  | "live-reference"
  | "skip-active"
  | "unpublished";

export type DisplayOpsIssueSeverity = "blocking" | "warning";

export type DisplayOpsBlockingIssue = {
  assetId?: number | null;
  code: DisplayOpsIssueCode;
  message: string;
  pageId?: DisplayPageKey;
  severity: DisplayOpsIssueSeverity;
};

export type DisplayOpsPagePublishState =
  | "draft-only"
  | "draft-pending"
  | "live"
  | "unconfigured";

export type DisplayOpsPageSummary = {
  blockingIssues: DisplayOpsBlockingIssue[];
  draftPending: boolean;
  draftVersion: number | null;
  labelEn: string;
  labelZh: string;
  liveVersion: number | null;
  pageId: DisplayPageKey;
  publishState: DisplayOpsPagePublishState;
  route: string;
  skipDetail: string | null;
  skipReason: DisplayRotationSkipReason | null;
  skipState: "playable" | "skipped";
};

export type DisplayOpsAssetReferenceKind = "cover" | "display-page" | "slideshow";
export type DisplayOpsAssetReferenceStage = "draft" | "live";

export type DisplayOpsAssetReference = {
  bindingId: string | null;
  kind: DisplayOpsAssetReferenceKind;
  message: string;
  pageId: DisplayPageKey | null;
  stage: DisplayOpsAssetReferenceStage;
  targetLabel: string;
};

export type DisplayOpsAssetReferenceSummary = {
  assetId: number;
  blockingIssues: DisplayOpsBlockingIssue[];
  draftCount: number;
  liveCount: number;
  references: DisplayOpsAssetReference[];
};

export type DisplayOpsSummary = {
  blockingIssues: DisplayOpsBlockingIssue[];
  draftCount: number;
  draftPending: boolean;
  generatedAt: string;
  lastPublishAt: string | null;
  liveVersion: number | null;
  pages: DisplayOpsPageSummary[];
  skipCount: number;
};

export type DisplaySyncEventScope =
  | "circuits"
  | "device"
  | "display-ops"
  | "display-pages"
  | "images"
  | "mqtt"
  | "playback";

export type DisplaySyncEvent = {
  generatedAt: string;
  reason: string;
  scope: DisplaySyncEventScope;
};
