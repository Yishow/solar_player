export const PREVIEW_DEBOUNCE_MS = 300;

export type PreviewRequestIdentity = {
  contextKey: string;
  editRevision: number;
};

export function nextEditRevision(current: number) {
  return current + 1;
}

export function shouldAcceptPreviewResponse(
  current: PreviewRequestIdentity,
  incoming: PreviewRequestIdentity
) {
  return current.editRevision === incoming.editRevision && current.contextKey === incoming.contextKey;
}
