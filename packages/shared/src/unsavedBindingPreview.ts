export function previewUnsavedBinding(current: { metricKey: string; metricScope: string }, draft: { metricKey: string; metricScope: string }) {
  return {
    applied: false,
    preview: draft,
    published: current
  };
}
