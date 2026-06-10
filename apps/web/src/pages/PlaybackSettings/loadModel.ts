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

export type PlaybackEditableModel = {
  pages: PlaybackPage[];
  settings: PlaybackSettings;
};

export type PlaybackDiagnosticsModel = {
  rotationPreview: DisplayRotationPreview;
};

export async function loadPlaybackEditableModel(
  loaders: PlaybackEditableModelLoaders = {}
): Promise<PlaybackEditableModel> {
  const [settings, pages] = await Promise.all([
    (loaders.readSettings ?? getPlaybackSettings)(),
    (loaders.readPages ?? getPlaybackPages)()
  ]);

  return {
    pages,
    settings
  };
}

export async function loadPlaybackDiagnosticsModel(
  loaders: PlaybackDiagnosticsModelLoaders = {}
): Promise<PlaybackDiagnosticsModel> {
  return {
    rotationPreview: await (loaders.readRotationPreview ?? getDisplayRotationPreview)()
  };
}
