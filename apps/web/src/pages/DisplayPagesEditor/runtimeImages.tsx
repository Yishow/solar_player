import { imagesAssetRuntimeMap } from "../Images/assets";
import {
  createImagesDisplayPageSeedConfig,
  type ImagesDisplayPageConfig
} from "../Images/displayPageConfig";
import { Images } from "../Images";
import type { DisplayEditorPageDefinition } from "./index";

export const imagesRuntimePageDefinition: DisplayEditorPageDefinition = {
  id: "images",
  label: "Images",
  renderPage: (pageId) => <Images pageId={pageId} />,
  templateKey: "images",
  createSeedConfig: () =>
    createImagesDisplayPageSeedConfig(imagesAssetRuntimeMap.main) as Record<string, unknown>,
  renderPreview: (config) => <Images config={config as ImagesDisplayPageConfig} />
};
