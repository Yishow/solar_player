export const displayPageMediaEffectDirections = ["left", "right"] as const;

export type DisplayPageMediaEffectDirection = (typeof displayPageMediaEffectDirections)[number];

export const displayPageMediaEffectBounds = {
  blurAmount: {
    max: 24,
    min: 0,
    step: 1
  },
  bottomFadeHeight: {
    max: 1,
    min: 0.05,
    step: 0.05
  },
  edgeFadeWidth: {
    max: 1,
    min: 0.05,
    step: 0.05
  },
  opacityValue: {
    max: 1,
    min: 0.1,
    step: 0.05
  }
} as const;

export type DisplayPageMediaEdgeFadeEffect = {
  direction?: DisplayPageMediaEffectDirection;
  enabled?: boolean;
  width?: number;
};

export type DisplayPageMediaBottomFadeEffect = {
  enabled?: boolean;
  height?: number;
};

export type DisplayPageMediaBlurEffect = {
  amount?: number;
  enabled?: boolean;
};

export type DisplayPageMediaOpacityEffect = {
  enabled?: boolean;
  value?: number;
};

export type DisplayPageMediaEffects = {
  blur?: DisplayPageMediaBlurEffect;
  bottomFade?: DisplayPageMediaBottomFadeEffect;
  edgeFade?: DisplayPageMediaEdgeFadeEffect;
  opacity?: DisplayPageMediaOpacityEffect;
};

export type DisplayPageResolvedMediaEffects = {
  blur: Required<DisplayPageMediaBlurEffect>;
  bottomFade: Required<DisplayPageMediaBottomFadeEffect>;
  edgeFade: Required<DisplayPageMediaEdgeFadeEffect>;
  opacity: Required<DisplayPageMediaOpacityEffect>;
};

export type DisplayPageMediaEffectSupport = {
  blur?: boolean;
  bottomFade?: boolean;
  edgeFade?: false | { directions?: DisplayPageMediaEffectDirection[] };
  opacity?: boolean;
};

export type DisplayPageMediaEffectResolverOptions = {
  defaults?: Partial<DisplayPageResolvedMediaEffects>;
  support?: DisplayPageMediaEffectSupport;
};

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

function resolveEnabled(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function createDisplayPageMediaEffects(
  overrides: Partial<DisplayPageResolvedMediaEffects> = {}
): DisplayPageResolvedMediaEffects {
  return {
    blur: {
      amount: 0,
      enabled: false,
      ...overrides.blur
    },
    bottomFade: {
      enabled: false,
      height: 0.46,
      ...overrides.bottomFade
    },
    edgeFade: {
      direction: "left",
      enabled: false,
      width: 0.56,
      ...overrides.edgeFade
    },
    opacity: {
      enabled: false,
      value: 1,
      ...overrides.opacity
    }
  };
}

export function resolveDisplayPageMediaEffects(
  effects: DisplayPageMediaEffects | null | undefined,
  options: DisplayPageMediaEffectResolverOptions = {}
): DisplayPageResolvedMediaEffects {
  const defaults = createDisplayPageMediaEffects(options.defaults);
  const support = options.support;
  const edgeFadeSupport = support?.edgeFade;
  const supportedEdgeDirections =
    typeof edgeFadeSupport === "object" && edgeFadeSupport.directions?.length
      ? edgeFadeSupport.directions
      : displayPageMediaEffectDirections;
  const fallbackEdgeDirection = supportedEdgeDirections.includes(defaults.edgeFade.direction)
    ? defaults.edgeFade.direction
    : supportedEdgeDirections[0];

  return {
    blur:
      support?.blur === false
        ? {
            ...defaults.blur,
            enabled: false
          }
        : {
            amount: clampNumber(
              effects?.blur?.amount,
              displayPageMediaEffectBounds.blurAmount.min,
              displayPageMediaEffectBounds.blurAmount.max,
              defaults.blur.amount
            ),
            enabled: resolveEnabled(effects?.blur?.enabled, defaults.blur.enabled)
          },
    bottomFade:
      support?.bottomFade === false
        ? {
            ...defaults.bottomFade,
            enabled: false
          }
        : {
            enabled: resolveEnabled(effects?.bottomFade?.enabled, defaults.bottomFade.enabled),
            height: clampNumber(
              effects?.bottomFade?.height,
              displayPageMediaEffectBounds.bottomFadeHeight.min,
              displayPageMediaEffectBounds.bottomFadeHeight.max,
              defaults.bottomFade.height
            )
          },
    edgeFade:
      support?.edgeFade === false
        ? {
            ...defaults.edgeFade,
            enabled: false
          }
        : {
            direction: supportedEdgeDirections.includes(
              effects?.edgeFade?.direction as DisplayPageMediaEffectDirection
            )
              ? (effects?.edgeFade?.direction as DisplayPageMediaEffectDirection)
              : fallbackEdgeDirection,
            enabled: resolveEnabled(effects?.edgeFade?.enabled, defaults.edgeFade.enabled),
            width: clampNumber(
              effects?.edgeFade?.width,
              displayPageMediaEffectBounds.edgeFadeWidth.min,
              displayPageMediaEffectBounds.edgeFadeWidth.max,
              defaults.edgeFade.width
            )
          },
    opacity:
      support?.opacity === false
        ? {
            ...defaults.opacity,
            enabled: false
          }
        : {
            enabled: resolveEnabled(effects?.opacity?.enabled, defaults.opacity.enabled),
            value: clampNumber(
              effects?.opacity?.value,
              displayPageMediaEffectBounds.opacityValue.min,
              displayPageMediaEffectBounds.opacityValue.max,
              defaults.opacity.value
            )
          }
  };
}
