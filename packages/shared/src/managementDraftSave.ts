import type { DisplayPageConfigEnvelope } from "./displayPageConfig.js";

export type ManagementDraftResourceType = "display-page-draft";

export type ManagementDraftSaveConflictCode = "management_draft_conflict";

export type ManagementDraftSavePrecondition = {
  baseVersion: number;
};

export type ManagementDraftSaveConflict<TEnvelope = Record<string, unknown>> = {
  baseVersion: number;
  currentVersion: number;
  latestEnvelope: TEnvelope;
  resourceId: string;
  resourceType: ManagementDraftResourceType;
};

export type ManagementDraftSaveConflictResponse<TEnvelope = Record<string, unknown>> = {
  code: ManagementDraftSaveConflictCode;
  conflict: ManagementDraftSaveConflict<TEnvelope>;
  error: string;
  success: false;
  timestamp: string;
};

export type DisplayPageDraftSaveConflict = ManagementDraftSaveConflict<DisplayPageConfigEnvelope>;
export type DisplayPageDraftSaveConflictResponse =
  ManagementDraftSaveConflictResponse<DisplayPageConfigEnvelope>;
