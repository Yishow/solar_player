export function previewUnsavedBinding(
  current: { metricKey: string; metricScope: string },
  draft: { metricKey: string; metricScope: string }
) {
  return {
    applied: false as const,
    preview: { ...draft },
    published: { ...current }
  };
}

export function unsavedBindingFingerprint(draft: { metricKey: string; metricScope: string }) {
  return `${draft.metricScope}:${draft.metricKey}`;
}
