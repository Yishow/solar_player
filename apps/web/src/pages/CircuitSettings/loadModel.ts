import type { CircuitConfig, PlaybackPage } from "@solar-display/shared";
import { getPlaybackPages, requestJson } from "../../services/api";

type CircuitListResponse = {
  success: boolean;
  data: CircuitConfig[];
  error?: string;
};

type CircuitEditableModelLoaders = {
  readCircuits?: () => Promise<CircuitConfig[]>;
  readPlaybackPages?: () => Promise<PlaybackPage[]>;
};

type CircuitEditableModelLoadOptions = {
  force?: boolean;
};

export type CircuitEditableModel = {
  circuits: CircuitConfig[];
  playbackPages: PlaybackPage[];
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
  const canUseCache = !loaders.readCircuits && !loaders.readPlaybackPages;

  if (!options.force && canUseCache && cachedCircuitEditableModel) {
    return cachedCircuitEditableModel;
  }

  const [circuits, playbackPages] = await Promise.all([
    (loaders.readCircuits ?? getCircuits)(),
    (loaders.readPlaybackPages ?? getPlaybackPages)()
  ]);
  const model = {
    circuits,
    playbackPages
  };

  if (canUseCache) {
    rememberCircuitEditableModel(model);
  }

  return model;
}
