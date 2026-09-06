export type SourceImpactConsumer = {
  kind: "draft" | "live" | "derived";
  itemId?: string | null;
  labelZh?: string | null;
  metricKey: string;
  pageId?: string;
};

export type SourceImpact = {
  canMutate: boolean;
  consumers: SourceImpactConsumer[];
  unknown: boolean;
};

export function evaluateSourceMutationImpact(input: {
  confirmResolved?: boolean;
  consumers: SourceImpactConsumer[];
  lookupFailed?: boolean;
}): SourceImpact {
  if (input.lookupFailed) {
    return { canMutate: false, consumers: input.consumers, unknown: true };
  }
  const hasConsumers = input.consumers.length > 0;
  if (hasConsumers && !input.confirmResolved) {
    return { canMutate: false, consumers: input.consumers, unknown: false };
  }
  return { canMutate: true, consumers: input.consumers, unknown: false };
}
