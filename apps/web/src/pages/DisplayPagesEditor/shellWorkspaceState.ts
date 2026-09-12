import type { ShellDecorationChannel, ShellDecorationEnvelope } from "@solar-display/shared";
import { resolveShellObjectSections } from "../ShellDecorationEditor/objectList";

export type ShellWorkspaceState = {
  draft: ShellDecorationEnvelope | undefined;
  savedChannel: ShellDecorationChannel | null;
};

export function toShellDecorationChannel(envelope: ShellDecorationEnvelope): ShellDecorationChannel {
  return {
    footerObjects: envelope.footerObjects,
    headerObjects: envelope.headerObjects
  };
}

export function createShellWorkspaceState(draft?: ShellDecorationEnvelope): ShellWorkspaceState {
  return {
    draft,
    savedChannel: draft ? toShellDecorationChannel(draft) : null
  };
}

export function updateShellWorkspaceDraft(
  state: ShellWorkspaceState,
  draft: ShellDecorationEnvelope | undefined
): ShellWorkspaceState {
  return {
    ...state,
    draft
  };
}

export function commitShellWorkspaceDraft(
  state: ShellWorkspaceState,
  draft: ShellDecorationEnvelope,
  submittedDraft?: ShellDecorationEnvelope
): ShellWorkspaceState {
  if (state.draft && draft.version < state.draft.version) return state;
  const keepNewerEdits = state.draft && submittedDraft && isShellDecorationChannelDirty(
    toShellDecorationChannel(state.draft),
    toShellDecorationChannel(submittedDraft)
  );
  return {
    // Keep edits made during the request, but advance their next baseVersion.
    draft: keepNewerEdits ? { ...draft, ...toShellDecorationChannel(state.draft!) } : draft,
    savedChannel: toShellDecorationChannel(draft)
  };
}

export function isShellDecorationChannelDirty(
  draft: ShellDecorationChannel,
  baseline: ShellDecorationChannel
) {
  return JSON.stringify(resolveShellObjectSections(draft)) !==
    JSON.stringify(resolveShellObjectSections(baseline));
}

export function isShellWorkspaceDirty(state: ShellWorkspaceState) {
  if (!state.draft || !state.savedChannel) {
    return false;
  }

  return isShellDecorationChannelDirty(toShellDecorationChannel(state.draft), state.savedChannel);
}
