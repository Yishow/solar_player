import type { DisplayPageMediaBinding } from "@solar-display/shared";
import {
  imagesArrowLayout,
  imagesCopyLayout,
  imagesInfoLayout,
  imagesMainLayout,
  imagesThumbLayout,
  imagesThumbSize
} from "./layout";

export type ImagesDisplayRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type ImagesDisplayPageConfig = {
  arrows: Record<"left" | "right", ImagesDisplayRect>;
  hero: {
    copyLines: [string, string, string];
    eyebrow: string;
    subtitle: string;
    title: string;
  };
  infoPanel: ImagesDisplayRect;
  mainStage: ImagesDisplayRect & DisplayPageMediaBinding;
  thumbnailSlots: Record<"thumb1" | "thumb2" | "thumb3" | "thumb4", ImagesDisplayRect>;
  textBlocks: {
    copy: {
      left: number;
      top: number;
      width: number;
    };
  };
};

export function createImagesDisplayPageSeedConfig(
  mainStageSrc = "/brand-logo.png",
  mainStageAlt = "綠能現場影像主舞台"
): ImagesDisplayPageConfig {
  return {
    arrows: {
      left: {
        height: 64,
        left: imagesArrowLayout.left.left,
        top: imagesArrowLayout.left.top,
        width: 64
      },
      right: {
        height: 64,
        left: imagesArrowLayout.right.left,
        top: imagesArrowLayout.right.top,
        width: 64
      }
    },
    hero: {
      copyLines: [
        "記錄國瑞汽車廠區內的綠能設施、",
        "綠色環境與永續實踐，見證我們",
        "每天為地球做出的努力。"
      ],
      eyebrow: "綠能驅動・永續未來",
      subtitle: "Green Energy in Action",
      title: "綠能現場影像"
    },
    infoPanel: { ...imagesInfoLayout },
    mainStage: {
      ...imagesMainLayout,
      alignX: 0.5,
      alignY: 0.52,
      alt: mainStageAlt,
      fitMode: "cover",
      focusX: 0.5,
      focusY: 0.52,
      src: mainStageSrc
    },
    textBlocks: {
      copy: { ...imagesCopyLayout }
    },
    thumbnailSlots: {
      thumb1: { ...imagesThumbLayout[0], ...imagesThumbSize },
      thumb2: { ...imagesThumbLayout[1], ...imagesThumbSize },
      thumb3: { ...imagesThumbLayout[2], ...imagesThumbSize },
      thumb4: { ...imagesThumbLayout[3], ...imagesThumbSize }
    }
  };
}
