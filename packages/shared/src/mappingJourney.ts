import type { MappingPreviewDraft } from "./guidedMqttMapping.js";

export type MappingJourneyStage = "select-data" | "field-meaning" | "preview-apply";

export const MAPPING_JOURNEY_STAGES: readonly MappingJourneyStage[] = [
  "select-data",
  "field-meaning",
  "preview-apply"
];

export const MAPPING_STAGE_LABELS: Record<MappingJourneyStage, string> = {
  "select-data": "① 選資料",
  "field-meaning": "② 選值與確認意義",
  "preview-apply": "③ 預覽與套用"
};

export function nextMappingStage(stage: MappingJourneyStage): MappingJourneyStage {
  const index = MAPPING_JOURNEY_STAGES.indexOf(stage);
  return MAPPING_JOURNEY_STAGES[Math.min(index + 1, MAPPING_JOURNEY_STAGES.length - 1)]!;
}

export function previousMappingStage(stage: MappingJourneyStage): MappingJourneyStage {
  const index = MAPPING_JOURNEY_STAGES.indexOf(stage);
  return MAPPING_JOURNEY_STAGES[Math.max(index - 1, 0)]!;
}

const DECIMAL_REGEX = /^-?(0|[1-9]\d*)(\.\d+)?$/u;

export function validateScaleMultiplier(input: string): {
  error?: string;
  normalized?: string;
  valid: boolean;
} {
  const trimmed = input.trim();
  if (trimmed === "" || trimmed === "-" || trimmed.endsWith(".")) {
    return { error: "乘數尚未完成輸入", valid: false };
  }
  if (!DECIMAL_REGEX.test(trimmed)) {
    return { error: "乘數必須為有效數字", valid: false };
  }
  const numeric = Number(trimmed);
  if (numeric === 0) {
    return { error: "乘數不可為 0", valid: false };
  }
  return { normalized: trimmed, valid: true };
}

export function detectAmbiguousTags(payload: unknown, tagKey = "tag"): string[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  const counts = new Map<string, number>();
  for (const item of payload) {
    if (item && typeof item === "object" && tagKey in item) {
      const rawTag = (item as Record<string, unknown>)[tagKey];
      if (typeof rawTag === "string" && rawTag.trim()) {
        const key = rawTag.trim();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([tag]) => tag);
}

export function inspectMessageProvenance(payload: unknown): {
  hasLegacyTs: boolean;
  isV1PowerEnvelope: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  let hasLegacyTs = false;
  let isV1PowerEnvelope = false;

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if ("ts" in record || "readAt" in record || "publishedAt" in record) {
      hasLegacyTs = true;
      warnings.push("時間戳為發佈端時間 (ts/publishedAt)，不可直接充當可靠的來源事件時間。");
    }
    if (record.protocol === "opc-power-v1" || record.envelopeVersion === "v1-power") {
      isV1PowerEnvelope = true;
      warnings.push("此封包標記為 opc-power-v1，須經正式電力通訊協議驗證，不得僅以 $.value 接入。");
    }
  }

  return { hasLegacyTs, isV1PowerEnvelope, warnings };
}

export function checkCumulativeBaseline(
  measurementKind: string,
  sampleCount: number
): {
  baselineAvailable: boolean;
  message?: string;
} {
  if (measurementKind === "cumulative-energy" && sampleCount <= 1) {
    return {
      baselineAvailable: false,
      message: "目前僅有一筆累積讀值樣本，尚未累積足夠的區間用電基線（需兩筆以上方可計算差分用電）。"
    };
  }
  return { baselineAvailable: true };
}

export function isManagedSolarTarget(metricKey: string): boolean {
  return metricKey.startsWith("solar.") || metricKey.startsWith("solar_");
}
