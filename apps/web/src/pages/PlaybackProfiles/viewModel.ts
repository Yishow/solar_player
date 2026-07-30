import type {
  PlaybackProfileDraft,
  PlaybackProfileSitePreview
} from "@solar-display/shared";

export function validateProfileDraftForPublish(draft: PlaybackProfileDraft) {
  const enabledPages = draft.pages.filter((page) => page.enabled);
  if (enabledPages.length === 0) {
    return "至少需要一個啟用頁面。";
  }
  if (!enabledPages.some((page) => page.id === draft.settings.startPage)) {
    return "起始頁面必須是已啟用頁面。";
  }
  if (
    draft.settings.scheduleEnabled
    && (!draft.settings.scheduleStart || !draft.settings.scheduleEnd)
  ) {
    return "啟用排程時必須填寫開始與結束時間。";
  }
  return null;
}

export function buildSitePreviewSummary(preview: PlaybackProfileSitePreview) {
  return {
    configured: preview.configured.length,
    diagnostics: Object.values(preview.diagnostics).reduce(
      (total, entries) => total + entries.length,
      0
    ),
    effective: preview.effective.length,
    skipped: preview.skipped.length
  };
}

export function buildProfilePublishConfirmation(
  profileName: string,
  nextVersion: number
) {
  return `確定發布「${profileName}」為不可變更的 Version ${nextVersion}？`;
}

export function createProfileRequestGuard() {
  let generation = 0;
  return {
    begin() {
      generation += 1;
      return generation;
    },
    isCurrent(candidate: number) {
      return candidate === generation;
    }
  };
}

export function isProfileDraftDirty(
  draft: PlaybackProfileDraft | null,
  persistedDraft: PlaybackProfileDraft | null
) {
  return Boolean(
    draft
    && persistedDraft
    && JSON.stringify({
      pages: draft.pages,
      settings: draft.settings
    }) !== JSON.stringify({
      pages: persistedDraft.pages,
      settings: persistedDraft.settings
    })
  );
}
