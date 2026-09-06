export type ObservedTag = {
  namespace: string;
  tag: string;
  topic: string;
  value: string;
};

export type ExistingMapping = {
  meterId: string;
  metricScope: "cl" | "kn";
  tagEquals?: string;
  topic?: string;
};

export type MappingSuggestion = {
  autoSelectAsSiteMain: false;
  existingMeterId?: string;
  namespace: string;
  reason: string;
  tag: string;
  topic: string;
  value: string;
};

export function suggestMappings(input: {
  existing?: ExistingMapping[];
  metricScope: "cl" | "kn";
  observations: ObservedTag[];
}): MappingSuggestion[] {
  const existing = input.existing ?? [];
  return input.observations.map((observation) => {
    const match = existing.find((row) =>
      row.metricScope === input.metricScope
      && (row.tagEquals === observation.tag || row.topic === observation.topic)
    );
    return {
      autoSelectAsSiteMain: false as const,
      existingMeterId: match?.meterId,
      namespace: observation.namespace,
      reason: match
        ? "已有相同結構的對應，將重用既有電錶身分。"
        : `依 ${observation.namespace} 的 tag=${observation.tag} 觀察到欄位，需確認目標後才套用。`,
      tag: observation.tag,
      topic: observation.topic,
      value: observation.value
    };
  });
}

export function applyBatchRecipe(input: {
  existing?: ExistingMapping[];
  metricScope: "cl" | "kn";
  selected: ObservedTag[];
  templateSelectorPath: string;
}) {
  const suggestions = suggestMappings({
    existing: input.existing,
    metricScope: input.metricScope,
    observations: input.selected
  });
  const reused = suggestions.filter((row) => row.existingMeterId);
  const created = suggestions.filter((row) => !row.existingMeterId).map((row, index) => ({
    channelId: `${input.metricScope}-${row.tag.toLowerCase()}-${index + 1}`,
    selectorPath: input.templateSelectorPath,
    tag: row.tag,
    topic: row.topic
  }));
  return {
    created,
    reused,
    selectedSiteMain: null as string | null,
    unresolved: [] as MappingSuggestion[]
  };
}
