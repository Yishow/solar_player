import type {
  DisplayPageId,
  DisplayPageFallbackStatus,
  FallbackPolicyKey,
  FallbackPolicyMode,
  ValidationResult
} from "@solar-display/shared";
import { useEffect, useState } from "react";
import { getDisplayPageFallbackStatus, publishDisplayPageDraft, validateDisplayPageDraft } from "../../services/api";

export type DisplayPagePublishingState = {
  fallback: DisplayPageFallbackStatus;
  validation: ValidationResult;
};

export type DisplayPagePublishingStateMap = Record<string, DisplayPagePublishingState | undefined>;

export function countBlockingFindings(validation?: ValidationResult | null) {
  return validation?.findings.filter((finding) => finding.severity === "blocking").length ?? 0;
}

export function formatFallbackMode(mode: FallbackPolicyMode) {
  return {
    hide: "隱藏內容",
    "show-placeholder": "顯示 placeholder",
    "show-seed": "顯示 seed"
  }[mode];
}

export function formatFallbackKey(key: FallbackPolicyKey) {
  return {
    staleData: "staleData",
    missingAsset: "missingAsset",
    emptyContent: "emptyContent"
  }[key];
}

export function useDisplayPagePublishingState(
  pageId: DisplayPageId,
  draftUpdatedAt: string | null | undefined,
  initialPublishingStateByPage: DisplayPagePublishingStateMap | undefined,
  reloadDraft: () => Promise<void>
) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishingError, setPublishingError] = useState("");
  const [publishingStateByPage, setPublishingStateByPage] = useState<DisplayPagePublishingStateMap>(
    initialPublishingStateByPage ?? {}
  );
  const publishingState = publishingStateByPage[pageId];
  const blockingCount = countBlockingFindings(publishingState?.validation);

  const refresh = async () => {
    const [validation, fallback] = await Promise.all([
      validateDisplayPageDraft(pageId),
      getDisplayPageFallbackStatus(pageId)
    ]);
    setPublishingStateByPage((current) => ({ ...current, [pageId]: { fallback, validation } }));
  };

  useEffect(() => {
    let active = true;
    void refresh()
      .then(() => {
        if (active) setPublishingError("");
      })
      .catch((error) => {
        if (active) setPublishingError(error instanceof Error ? error.message : "讀取發布狀態失敗。");
      });
    return () => {
      active = false;
    };
  }, [draftUpdatedAt, pageId]);

  const publish = async () => {
    setIsPublishing(true);
    setPublishingError("");
    try {
      await publishDisplayPageDraft(pageId);
      await reloadDraft();
      await refresh();
    } catch (error) {
      setPublishingError(error instanceof Error ? error.message : "發布草稿失敗。");
    } finally {
      setIsPublishing(false);
    }
  };

  return {
    blockingCount,
    isPublishBlocked: blockingCount > 0,
    isPublishing,
    publish,
    publishingError,
    publishingState,
    refresh
  };
}
