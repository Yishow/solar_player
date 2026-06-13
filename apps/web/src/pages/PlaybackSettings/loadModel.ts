import type {
  DisplayRotationPreview,
  PlaybackPage,
  PlaybackSettings
} from "@solar-display/shared";
import {
  getDisplayRotationPreview,
  getPlaybackPages,
  getPlaybackSettings
} from "../../services/api";

type PlaybackEditableModelLoaders = {
  readPages?: () => Promise<PlaybackPage[]>;
  readSettings?: () => Promise<PlaybackSettings>;
};

type PlaybackDiagnosticsModelLoaders = {
  readRotationPreview?: () => Promise<DisplayRotationPreview>;
};

type PlaybackEditableModelLoadOptions = {
  force?: boolean;
};

export type PlaybackEditableModel = {
  pages: PlaybackPage[];
  settings: PlaybackSettings;
};

export type PlaybackDiagnosticsModel = {
  rotationPreview: DisplayRotationPreview;
};

let cachedPlaybackEditableModel: PlaybackEditableModel | null = null;

export function readCachedPlaybackEditableModel() {
  return cachedPlaybackEditableModel;
}

export function rememberPlaybackEditableModel(model: PlaybackEditableModel) {
  cachedPlaybackEditableModel = model;
}

export async function loadPlaybackEditableModel(
  loaders: PlaybackEditableModelLoaders = {},
  options: PlaybackEditableModelLoadOptions = {}
): Promise<PlaybackEditableModel> {
  const canUseCache = !loaders.readPages && !loaders.readSettings;

  if (!options.force && canUseCache && cachedPlaybackEditableModel) {
    return cachedPlaybackEditableModel;
  }

  const [settings, pages] = await Promise.all([
    (loaders.readSettings ?? getPlaybackSettings)(),
    (loaders.readPages ?? getPlaybackPages)()
  ]);

  const model = {
    pages,
    settings
  };

  if (canUseCache) {
    rememberPlaybackEditableModel(model);
  }

  return model;
}

export async function loadPlaybackDiagnosticsModel(
  loaders: PlaybackDiagnosticsModelLoaders = {}
): Promise<PlaybackDiagnosticsModel> {
  return {
    rotationPreview: await (loaders.readRotationPreview ?? getDisplayRotationPreview)()
  };
}
