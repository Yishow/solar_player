import type { ConfigStage, DisplayPageConfigEnvelope, DisplayPageId } from "@solar-display/shared";

export type DraftInteractionStateInput = {
  enabled: boolean;
  isLoading: boolean;
  lastLoadedEnvelope: DisplayPageConfigEnvelope | null;
  pageId: DisplayPageId;
  stage: ConfigStage;
};

export type DraftInteractionState = {
  canEdit: boolean;
  hasAuthoritativeBaseline: boolean;
  isPending: boolean;
};

export function resolveDraftInteractionState(
  input: DraftInteractionStateInput
): DraftInteractionState {
  const isEnabledDraft = input.enabled && input.stage === "draft";
  const hasAuthoritativeBaseline = Boolean(
    isEnabledDraft &&
      input.lastLoadedEnvelope &&
      input.lastLoadedEnvelope.stage === input.stage &&
      input.lastLoadedEnvelope.pageId === input.pageId
  );
  const isPending = isEnabledDraft && input.isLoading;

  return {
    canEdit: !isEnabledDraft || (hasAuthoritativeBaseline && !isPending),
    hasAuthoritativeBaseline,
    isPending
  };
}

export function canEditDraft(input: DraftInteractionStateInput) {
  return resolveDraftInteractionState(input).canEdit;
}
