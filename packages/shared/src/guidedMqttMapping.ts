export type MappingSelector = {
  path: string[];
  tagEquals?: string;
};

export type MappingPreviewDraft = {
  channelId: string;
  energyFlowRole: "consumption" | "generation" | "grid-import" | "grid-export";
  measurementKind: "power-gauge" | "cumulative-energy" | "interval-energy";
  metricScope: "cl" | "kn";
  selector: MappingSelector;
  timestampPolicy: "source-required" | "allow-receive-time-estimate";
};

const tokens = new Map<string, { draft: MappingPreviewDraft; hash: string }>();

export function compileSelector(path: string, tagEquals?: string): MappingSelector {
  return { path: path.split(".").filter(Boolean), tagEquals };
}

export function extractBySelector(payload: unknown, selector: MappingSelector): unknown {
  let current: unknown = payload;
  for (const token of selector.path) {
    if (current && typeof current === "object" && token in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[token];
    } else {
      return undefined;
    }
  }
  if (selector.tagEquals && current && typeof current === "object" && "tag" in current) {
    return (current as { tag?: unknown }).tag === selector.tagEquals ? current : undefined;
  }
  return current;
}

export function previewMapping(draft: MappingPreviewDraft) {
  const hash = JSON.stringify(draft);
  const previewToken = `m2-${draft.metricScope}-${Date.now()}`;
  tokens.set(previewToken, { draft, hash });
  return { canonicalDraft: draft, previewToken };
}

export function applyMapping(input: { previewToken: string; canonicalDraft: MappingPreviewDraft; idempotencyKey: string }) {
  const stored = tokens.get(input.previewToken);
  if (!stored) {
    throw Object.assign(new Error("PREVIEW_EXPIRED"), { code: "PREVIEW_EXPIRED" });
  }
  if (JSON.stringify(input.canonicalDraft) !== stored.hash) {
    throw Object.assign(new Error("PREVIEW_DRAFT_MISMATCH"), { code: "PREVIEW_DRAFT_MISMATCH" });
  }
  return { applied: true, channelId: input.canonicalDraft.channelId, previewToken: input.previewToken };
}
