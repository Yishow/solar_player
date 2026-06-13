import type { CircuitConfig } from "@solar-display/shared";
import { requestJson } from "../../services/api";

type CircuitListResponse = {
  success: boolean;
  data: CircuitConfig[];
  error?: string;
};

type CircuitEditableModelLoaders = {
  readCircuits?: () => Promise<CircuitConfig[]>;
};

type CircuitEditableModelLoadOptions = {
  force?: boolean;
};

export type CircuitEditableModel = {
  circuits: CircuitConfig[];
};

let cachedCircuitEditableModel: CircuitEditableModel | null = null;

export function readCachedCircuitEditableModel() {
  return cachedCircuitEditableModel;
}

export function rememberCircuitEditableModel(model: CircuitEditableModel) {
  cachedCircuitEditableModel = model;
}

export async function getCircuits() {
  const response = await requestJson<CircuitListResponse>("/api/circuits");
  if (!response.success) {
    throw new Error(response.error ?? "載入迴路設定失敗。");
  }
  return response.data;
}

export async function loadCircuitEditableModel(
  loaders: CircuitEditableModelLoaders = {},
  options: CircuitEditableModelLoadOptions = {}
): Promise<CircuitEditableModel> {
  const canUseCache = !loaders.readCircuits;

  if (!options.force && canUseCache && cachedCircuitEditableModel) {
    return cachedCircuitEditableModel;
  }

  const model = {
    circuits: await (loaders.readCircuits ?? getCircuits)()
  };

  if (canUseCache) {
    rememberCircuitEditableModel(model);
  }

  return model;
}
