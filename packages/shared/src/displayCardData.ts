export type DisplayCardDataPageId =
  | "factory-circuit"
  | "factory-circuit-guanyin"
  | "overview"
  | "solar"
  | "sustainability";

export type DisplayCardDataStatus =
  | "formula-input-missing"
  | "idle-topic"
  | "manual-only"
  | "missing-topic"
  | "overridden"
  | "ready"
  | "waiting-aggregate";

export type DisplayCardDataDependency = {
  latestValue: string | null;
  metricKey: string;
  status: DisplayCardDataStatus;
  topic: string | null;
};

export type DisplayCardDataAction =
  | {
      metricKey: string;
      type: "configure-topic" | "publish-test-value";
    }
  | {
      fields: string[];
      type: "edit-calculation-settings";
    }
  | {
      type: "set-display-override";
    };

export type DisplayCardValueOverride = {
  active: boolean;
  cardId: string;
  displayValue: number;
  enabled: boolean;
  expiresAt: string | null;
  metricKey: string;
  pageId: DisplayCardDataPageId;
  reason: string | null;
  targetId: string;
  unit: string | null;
  updatedAt: string;
};

export type DisplayCardDataRow = {
  actions: DisplayCardDataAction[];
  aggregateSource: string | null;
  calculationFields: string[];
  cardId: string;
  dependencies: DisplayCardDataDependency[];
  displayValue: string;
  formula: string | null;
  label: string;
  lastUpdatedAt: string | null;
  metricKey: string;
  originalValue: string | null;
  override: DisplayCardValueOverride | null;
  pageId: DisplayCardDataPageId;
  sourceClassification: string;
  sourceTopics: Array<{
    metricKey: string;
    topic: string;
  }>;
  status: DisplayCardDataStatus;
  unit: string;
};

export type DisplayCardDataResponse = {
  generatedAt: string;
  rows: DisplayCardDataRow[];
};
