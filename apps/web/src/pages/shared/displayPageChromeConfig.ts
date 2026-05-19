import type {
  DisplayEditorFieldSchema,
  DisplayEditorNumberFieldSchema,
  DisplayEditorPath
} from "../../../../../packages/shared/src/displayEditorSchema";

function resolveNonNegativeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function numberField(
  id: string,
  label: string,
  path: DisplayEditorPath,
  options: {
    max?: number;
    min?: number;
    step?: number;
  } = {}
): DisplayEditorNumberFieldSchema {
  return {
    constraints: {
      ...(options.max !== undefined ? { max: options.max } : {}),
      ...(options.min !== undefined ? { min: options.min } : {})
    },
    fieldType: "number",
    id,
    label,
    path,
    ...(options.step !== undefined ? { step: options.step } : {})
  };
}

export type HeroTypographyConfig = {
  eyebrowFontSize: number;
  eyebrowLetterSpacing: number;
  eyebrowMarginBottom: number;
  subtitleFontSize: number;
  subtitleLineHeight: number;
  subtitleMarginTop: number;
  titleEmphasisWeight: number;
  titleFontSize: number;
  titleLetterSpacing: number;
  titleLineHeight: number;
};

export function createHeroTypographyConfig(
  overrides: Partial<Record<keyof HeroTypographyConfig, unknown>> = {}
): HeroTypographyConfig {
  return {
    eyebrowFontSize: resolveNonNegativeNumber(overrides.eyebrowFontSize, 24),
    eyebrowLetterSpacing: resolveNonNegativeNumber(overrides.eyebrowLetterSpacing, 9),
    eyebrowMarginBottom: resolveNonNegativeNumber(overrides.eyebrowMarginBottom, 18),
    subtitleFontSize: resolveNonNegativeNumber(overrides.subtitleFontSize, 26),
    subtitleLineHeight: resolveNonNegativeNumber(overrides.subtitleLineHeight, 1.4),
    subtitleMarginTop: resolveNonNegativeNumber(overrides.subtitleMarginTop, 20),
    titleEmphasisWeight: resolveNonNegativeNumber(overrides.titleEmphasisWeight, 800),
    titleFontSize: resolveNonNegativeNumber(overrides.titleFontSize, 80),
    titleLetterSpacing: resolveNonNegativeNumber(overrides.titleLetterSpacing, 6),
    titleLineHeight: resolveNonNegativeNumber(overrides.titleLineHeight, 1.15)
  };
}

export function buildHeroTypographyFields({
  idPrefix,
  path
}: {
  idPrefix: string;
  path: DisplayEditorPath;
}): DisplayEditorFieldSchema[] {
  return [
    numberField(`${idPrefix}-hero-eyebrow-font-size`, "Eyebrow Font Size", [...path, "eyebrowFontSize"], { min: 0 }),
    numberField(`${idPrefix}-hero-eyebrow-letter-spacing`, "Eyebrow Letter Spacing", [...path, "eyebrowLetterSpacing"], { min: 0 }),
    numberField(`${idPrefix}-hero-eyebrow-margin-bottom`, "Eyebrow Margin Bottom", [...path, "eyebrowMarginBottom"], { min: 0 }),
    numberField(`${idPrefix}-hero-title-font-size`, "Title Font Size", [...path, "titleFontSize"], { min: 0 }),
    numberField(`${idPrefix}-hero-title-letter-spacing`, "Title Letter Spacing", [...path, "titleLetterSpacing"], { min: 0 }),
    numberField(`${idPrefix}-hero-title-line-height`, "Title Line Height", [...path, "titleLineHeight"], { min: 0, step: 0.05 }),
    numberField(`${idPrefix}-hero-title-emphasis-weight`, "Title Emphasis Weight", [...path, "titleEmphasisWeight"], { min: 0 }),
    numberField(`${idPrefix}-hero-subtitle-font-size`, "Subtitle Font Size", [...path, "subtitleFontSize"], { min: 0 }),
    numberField(`${idPrefix}-hero-subtitle-margin-top`, "Subtitle Margin Top", [...path, "subtitleMarginTop"], { min: 0 }),
    numberField(`${idPrefix}-hero-subtitle-line-height`, "Subtitle Line Height", [...path, "subtitleLineHeight"], { min: 0, step: 0.05 })
  ];
}

export type GoldLineChromeConfig = {
  offsetY: number;
  opacity: number;
  thickness: number;
};

export function createGoldLineChromeConfig(
  overrides: Partial<Record<keyof GoldLineChromeConfig, unknown>> = {}
): GoldLineChromeConfig {
  return {
    offsetY: typeof overrides.offsetY === "number" && Number.isFinite(overrides.offsetY) ? overrides.offsetY : 0,
    opacity:
      typeof overrides.opacity === "number" && Number.isFinite(overrides.opacity) && overrides.opacity >= 0 && overrides.opacity <= 1
        ? overrides.opacity
        : 0.8,
    thickness: resolveNonNegativeNumber(overrides.thickness, 1)
  };
}

export function buildGoldLineFields({
  idPrefix,
  path
}: {
  idPrefix: string;
  path: DisplayEditorPath;
}): DisplayEditorFieldSchema[] {
  return [
    numberField(`${idPrefix}-gold-line-thickness`, "Gold Line Thickness", [...path, "thickness"], { min: 0 }),
    numberField(`${idPrefix}-gold-line-offset-y`, "Gold Line Offset Y", [...path, "offsetY"], { step: 1 }),
    numberField(`${idPrefix}-gold-line-opacity`, "Gold Line Opacity", [...path, "opacity"], { min: 0, max: 1, step: 0.05 })
  ];
}

export type LeafOrnamentChromeConfig = {
  offsetX: number;
  offsetY: number;
  opacity: number;
  scale: number;
};

export function createLeafOrnamentChromeConfig(
  overrides: Partial<Record<keyof LeafOrnamentChromeConfig, unknown>> = {}
): LeafOrnamentChromeConfig {
  return {
    offsetX: typeof overrides.offsetX === "number" && Number.isFinite(overrides.offsetX) ? overrides.offsetX : 0,
    offsetY: typeof overrides.offsetY === "number" && Number.isFinite(overrides.offsetY) ? overrides.offsetY : 0,
    opacity:
      typeof overrides.opacity === "number" && Number.isFinite(overrides.opacity) && overrides.opacity >= 0 && overrides.opacity <= 1
        ? overrides.opacity
        : 0.4,
    scale: resolveNonNegativeNumber(overrides.scale, 1)
  };
}

export function buildLeafOrnamentFields({
  idPrefix,
  path
}: {
  idPrefix: string;
  path: DisplayEditorPath;
}): DisplayEditorFieldSchema[] {
  return [
    numberField(`${idPrefix}-leaf-offset-x`, "Leaf Offset X", [...path, "offsetX"], { step: 1 }),
    numberField(`${idPrefix}-leaf-offset-y`, "Leaf Offset Y", [...path, "offsetY"], { step: 1 }),
    numberField(`${idPrefix}-leaf-opacity`, "Leaf Opacity", [...path, "opacity"], { min: 0, max: 1, step: 0.05 }),
    numberField(`${idPrefix}-leaf-scale`, "Leaf Scale", [...path, "scale"], { min: 0, step: 0.05 })
  ];
}

export type CounterChromeConfig = {
  bodyFontSize: number;
  bodyMarginTop: number;
  currentFontSize: number;
  progressThickness: number;
  progressTopOffset: number;
  totalFontSize: number;
};

export function createCounterChromeConfig(
  overrides: Partial<Record<keyof CounterChromeConfig, unknown>> = {}
): CounterChromeConfig {
  return {
    bodyFontSize: resolveNonNegativeNumber(overrides.bodyFontSize, 18),
    bodyMarginTop: resolveNonNegativeNumber(overrides.bodyMarginTop, 20),
    currentFontSize: resolveNonNegativeNumber(overrides.currentFontSize, 76),
    progressThickness: resolveNonNegativeNumber(overrides.progressThickness, 7),
    progressTopOffset: resolveNonNegativeNumber(overrides.progressTopOffset, 134),
    totalFontSize: resolveNonNegativeNumber(overrides.totalFontSize, 38)
  };
}

export function buildCounterChromeFields({
  idPrefix,
  path
}: {
  idPrefix: string;
  path: DisplayEditorPath;
}): DisplayEditorFieldSchema[] {
  return [
    numberField(`${idPrefix}-counter-current-font-size`, "Current Font Size", [...path, "currentFontSize"], { min: 0 }),
    numberField(`${idPrefix}-counter-total-font-size`, "Total Font Size", [...path, "totalFontSize"], { min: 0 }),
    numberField(`${idPrefix}-counter-body-font-size`, "Body Font Size", [...path, "bodyFontSize"], { min: 0 }),
    numberField(`${idPrefix}-counter-body-margin-top`, "Body Margin Top", [...path, "bodyMarginTop"], { min: 0 }),
    numberField(`${idPrefix}-counter-progress-thickness`, "Progress Thickness", [...path, "progressThickness"], { min: 0 }),
    numberField(`${idPrefix}-counter-progress-top-offset`, "Progress Top Offset", [...path, "progressTopOffset"], { min: 0 })
  ];
}

export type ArrowChromeConfig = {
  borderRadius: number;
  buttonSize: number;
  fontSize: number;
};

export function createArrowChromeConfig(
  overrides: Partial<Record<keyof ArrowChromeConfig, unknown>> = {}
): ArrowChromeConfig {
  return {
    borderRadius: resolveNonNegativeNumber(overrides.borderRadius, 32),
    buttonSize: resolveNonNegativeNumber(overrides.buttonSize, 64),
    fontSize: resolveNonNegativeNumber(overrides.fontSize, 54)
  };
}

export function buildArrowChromeFields({
  idPrefix,
  path
}: {
  idPrefix: string;
  path: DisplayEditorPath;
}): DisplayEditorFieldSchema[] {
  return [
    numberField(`${idPrefix}-arrow-button-size`, "Arrow Button Size", [...path, "buttonSize"], { min: 0 }),
    numberField(`${idPrefix}-arrow-font-size`, "Arrow Font Size", [...path, "fontSize"], { min: 0 }),
    numberField(`${idPrefix}-arrow-border-radius`, "Arrow Border Radius", [...path, "borderRadius"], { min: 0 })
  ];
}

export type PeriodChipsChromeConfig = {
  chipGap: number;
  chipPaddingX: number;
  chipPaddingY: number;
  fontSize: number;
  radius: number;
};

export function createPeriodChipsChromeConfig(
  overrides: Partial<Record<keyof PeriodChipsChromeConfig, unknown>> = {}
): PeriodChipsChromeConfig {
  return {
    chipGap: resolveNonNegativeNumber(overrides.chipGap, 10),
    chipPaddingX: resolveNonNegativeNumber(overrides.chipPaddingX, 16),
    chipPaddingY: resolveNonNegativeNumber(overrides.chipPaddingY, 10),
    fontSize: resolveNonNegativeNumber(overrides.fontSize, 17),
    radius: resolveNonNegativeNumber(overrides.radius, 999)
  };
}

export function buildPeriodChipsChromeFields({
  idPrefix,
  path
}: {
  idPrefix: string;
  path: DisplayEditorPath;
}): DisplayEditorFieldSchema[] {
  return [
    numberField(`${idPrefix}-period-chip-gap`, "Chip Gap", [...path, "chipGap"], { min: 0 }),
    numberField(`${idPrefix}-period-chip-padding-x`, "Chip Padding X", [...path, "chipPaddingX"], { min: 0 }),
    numberField(`${idPrefix}-period-chip-padding-y`, "Chip Padding Y", [...path, "chipPaddingY"], { min: 0 }),
    numberField(`${idPrefix}-period-chip-font-size`, "Chip Font Size", [...path, "fontSize"], { min: 0 }),
    numberField(`${idPrefix}-period-chip-radius`, "Chip Radius", [...path, "radius"], { min: 0 })
  ];
}

export type ProvenanceChromeConfig = {
  fontSize: number;
  lineHeight: number;
};

export function createProvenanceChromeConfig(
  overrides: Partial<Record<keyof ProvenanceChromeConfig, unknown>> = {}
): ProvenanceChromeConfig {
  return {
    fontSize: resolveNonNegativeNumber(overrides.fontSize, 15),
    lineHeight: resolveNonNegativeNumber(overrides.lineHeight, 1.55)
  };
}

export function buildProvenanceChromeFields({
  idPrefix,
  path
}: {
  idPrefix: string;
  path: DisplayEditorPath;
}): DisplayEditorFieldSchema[] {
  return [
    numberField(`${idPrefix}-provenance-font-size`, "Provenance Font Size", [...path, "fontSize"], { min: 0 }),
    numberField(`${idPrefix}-provenance-line-height`, "Provenance Line Height", [...path, "lineHeight"], { min: 0, step: 0.05 })
  ];
}

export type StatusBlockChromeConfig = {
  bodyFontSize: number;
  gap: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  radius: number;
  titleFontSize: number;
};

export function createStatusBlockChromeConfig(
  overrides: Partial<Record<keyof StatusBlockChromeConfig, unknown>> = {}
): StatusBlockChromeConfig {
  return {
    bodyFontSize: resolveNonNegativeNumber(overrides.bodyFontSize, 14),
    gap: resolveNonNegativeNumber(overrides.gap, 8),
    paddingBottom: resolveNonNegativeNumber(overrides.paddingBottom, 16),
    paddingLeft: resolveNonNegativeNumber(overrides.paddingLeft, 18),
    paddingRight: resolveNonNegativeNumber(overrides.paddingRight, 18),
    paddingTop: resolveNonNegativeNumber(overrides.paddingTop, 16),
    radius: resolveNonNegativeNumber(overrides.radius, 18),
    titleFontSize: resolveNonNegativeNumber(overrides.titleFontSize, 18)
  };
}

export function buildStatusBlockChromeFields({
  idPrefix,
  path
}: {
  idPrefix: string;
  path: DisplayEditorPath;
}): DisplayEditorFieldSchema[] {
  return [
    numberField(`${idPrefix}-status-padding-top`, "Padding Top", [...path, "paddingTop"], { min: 0 }),
    numberField(`${idPrefix}-status-padding-right`, "Padding Right", [...path, "paddingRight"], { min: 0 }),
    numberField(`${idPrefix}-status-padding-bottom`, "Padding Bottom", [...path, "paddingBottom"], { min: 0 }),
    numberField(`${idPrefix}-status-padding-left`, "Padding Left", [...path, "paddingLeft"], { min: 0 }),
    numberField(`${idPrefix}-status-radius`, "Corner Radius", [...path, "radius"], { min: 0 }),
    numberField(`${idPrefix}-status-gap`, "Item Gap", [...path, "gap"], { min: 0 }),
    numberField(`${idPrefix}-status-title-font-size`, "Title Font Size", [...path, "titleFontSize"], { min: 0 }),
    numberField(`${idPrefix}-status-body-font-size`, "Body Font Size", [...path, "bodyFontSize"], { min: 0 })
  ];
}
