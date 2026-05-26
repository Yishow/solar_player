import {
  createDisplayPageMediaEffects,
  displayPageMediaEffectBounds,
  type DisplayPageMediaEffectResolverOptions
} from "@solar-display/shared";
import type { DisplayEditorFieldSchema, DisplayEditorPath } from "../../../../../packages/shared/src/displayEditorSchema";

export const overviewHeroMediaEffectResolverOptions: DisplayPageMediaEffectResolverOptions = {
  defaults: createDisplayPageMediaEffects({
    bottomFade: {
      enabled: true,
      height: 0.55
    },
    edgeFade: {
      direction: "left",
      enabled: true,
      width: 0.56
    }
  }),
  support: {
    blur: true,
    bottomFade: true,
    edgeFade: {
      directions: ["left", "right"]
    },
    opacity: true
  }
};

export const imagesMainStageMediaEffectResolverOptions: DisplayPageMediaEffectResolverOptions = {
  defaults: createDisplayPageMediaEffects({
    bottomFade: {
      enabled: true,
      height: 120 / 622
    },
    edgeFade: {
      direction: "left",
      enabled: true,
      width: 0.56
    }
  }),
  support: {
    blur: true,
    bottomFade: true,
    edgeFade: {
      directions: ["left", "right"]
    },
    opacity: true
  }
};

export function buildDisplayPageMediaEffectFields(
  idPrefix: string,
  bindingPath: DisplayEditorPath
): DisplayEditorFieldSchema[] {
  const effectsPath: DisplayEditorPath = [...bindingPath, "effects"];

  return [
    {
      fieldType: "toggle",
      id: `${idPrefix}-edge-fade-enabled`,
      label: "邊緣淡出",
      path: [...effectsPath, "edgeFade", "enabled"]
    },
    {
      fieldType: "select",
      id: `${idPrefix}-edge-fade-direction`,
      label: "邊緣淡出方向",
      options: [
        { label: "左側", value: "left" },
        { label: "右側", value: "right" }
      ],
      path: [...effectsPath, "edgeFade", "direction"],
      visibleWhen: {
        equals: true,
        path: [...effectsPath, "edgeFade", "enabled"]
      }
    },
    {
      constraints: {
        max: displayPageMediaEffectBounds.edgeFadeWidth.max,
        min: displayPageMediaEffectBounds.edgeFadeWidth.min
      },
      fieldType: "number",
      id: `${idPrefix}-edge-fade-width`,
      label: "邊緣淡出寬度",
      path: [...effectsPath, "edgeFade", "width"],
      step: displayPageMediaEffectBounds.edgeFadeWidth.step,
      visibleWhen: {
        equals: true,
        path: [...effectsPath, "edgeFade", "enabled"]
      }
    },
    {
      fieldType: "toggle",
      id: `${idPrefix}-bottom-fade-enabled`,
      label: "底部淡出",
      path: [...effectsPath, "bottomFade", "enabled"]
    },
    {
      constraints: {
        max: displayPageMediaEffectBounds.bottomFadeHeight.max,
        min: displayPageMediaEffectBounds.bottomFadeHeight.min
      },
      fieldType: "number",
      id: `${idPrefix}-bottom-fade-height`,
      label: "底部淡出高度",
      path: [...effectsPath, "bottomFade", "height"],
      step: displayPageMediaEffectBounds.bottomFadeHeight.step,
      visibleWhen: {
        equals: true,
        path: [...effectsPath, "bottomFade", "enabled"]
      }
    },
    {
      fieldType: "toggle",
      id: `${idPrefix}-blur-enabled`,
      label: "模糊",
      path: [...effectsPath, "blur", "enabled"]
    },
    {
      constraints: {
        max: displayPageMediaEffectBounds.blurAmount.max,
        min: displayPageMediaEffectBounds.blurAmount.min
      },
      fieldType: "number",
      id: `${idPrefix}-blur-amount`,
      label: "模糊強度",
      path: [...effectsPath, "blur", "amount"],
      step: displayPageMediaEffectBounds.blurAmount.step,
      visibleWhen: {
        equals: true,
        path: [...effectsPath, "blur", "enabled"]
      }
    },
    {
      fieldType: "toggle",
      id: `${idPrefix}-opacity-enabled`,
      label: "不透明度",
      path: [...effectsPath, "opacity", "enabled"]
    },
    {
      constraints: {
        max: displayPageMediaEffectBounds.opacityValue.max,
        min: displayPageMediaEffectBounds.opacityValue.min
      },
      fieldType: "number",
      id: `${idPrefix}-opacity-value`,
      label: "不透明度數值",
      path: [...effectsPath, "opacity", "value"],
      step: displayPageMediaEffectBounds.opacityValue.step,
      visibleWhen: {
        equals: true,
        path: [...effectsPath, "opacity", "enabled"]
      }
    }
  ];
}
