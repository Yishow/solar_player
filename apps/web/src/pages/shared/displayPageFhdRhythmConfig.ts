import type { CSSProperties } from "react";
import type { DisplayEditorFieldSchema, DisplayEditorPath } from "../../../../../packages/shared/src/displayEditorSchema";

export type FactoryLoadRowRhythmConfig = {
  copyGap: number;
  horizontalPadding: number;
  iconTextGap: number;
  labelFontSize: number;
  labelLineHeight: number;
  valueFontSize: number;
};

export type ImagesCaptionRhythmConfig = {
  bodyFontSize: number;
  bodyLineHeight: number;
  bodyMarginTop: number;
  metaFontSize: number;
  metaLineHeight: number;
};

export type SustainabilityHighlightRhythmConfig = {
  cardPaddingX: number;
  cardPaddingY: number;
  labelFontSize: number;
  labelMarginTop: number;
  unitFontSize: number;
  valueFontSize: number;
};

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberField({
  id,
  label,
  max,
  min,
  path,
  step = 1,
  unit
}: {
  id: string;
  label: string;
  max: number;
  min: number;
  path: DisplayEditorPath;
  step?: number;
  unit?: string;
}): DisplayEditorFieldSchema {
  return {
    constraints: { max, min },
    fieldType: "number",
    group: "FHD Rhythm",
    id,
    label,
    path,
    resettable: true,
    step,
    ...(unit ? { unit } : {})
  };
}

export function createFactoryLoadRowRhythmConfig(
  overrides: Partial<Record<keyof FactoryLoadRowRhythmConfig, unknown>> = {}
): FactoryLoadRowRhythmConfig {
  return {
    copyGap: boundedNumber(overrides.copyGap, 6, 0, 24),
    horizontalPadding: boundedNumber(overrides.horizontalPadding, 26, 0, 48),
    iconTextGap: boundedNumber(overrides.iconTextGap, 24, 0, 48),
    labelFontSize: boundedNumber(overrides.labelFontSize, 22, 10, 36),
    labelLineHeight: boundedNumber(overrides.labelLineHeight, 1.15, 0.8, 2),
    valueFontSize: boundedNumber(overrides.valueFontSize, 31, 18, 56)
  };
}

export function resolveFactoryLoadRowRhythmConfig(
  value: unknown,
  fallback: FactoryLoadRowRhythmConfig = createFactoryLoadRowRhythmConfig()
): FactoryLoadRowRhythmConfig {
  const source = isRecord(value) ? value : {};
  const fallbackConfig = createFactoryLoadRowRhythmConfig(fallback);

  return createFactoryLoadRowRhythmConfig({
    copyGap: boundedNumber(source.copyGap, fallbackConfig.copyGap, 0, 24),
    horizontalPadding: boundedNumber(source.horizontalPadding, fallbackConfig.horizontalPadding, 0, 48),
    iconTextGap: boundedNumber(source.iconTextGap, fallbackConfig.iconTextGap, 0, 48),
    labelFontSize: boundedNumber(source.labelFontSize, fallbackConfig.labelFontSize, 10, 36),
    labelLineHeight: boundedNumber(source.labelLineHeight, fallbackConfig.labelLineHeight, 0.8, 2),
    valueFontSize: boundedNumber(source.valueFontSize, fallbackConfig.valueFontSize, 18, 56)
  });
}

export function buildFactoryLoadRowRhythmStyle(config: FactoryLoadRowRhythmConfig): CSSProperties {
  return {
    ["--factory-load-row-copy-gap" as string]: `${config.copyGap}px`,
    ["--factory-load-row-horizontal-padding" as string]: `${config.horizontalPadding}px`,
    ["--factory-load-row-icon-text-gap" as string]: `${config.iconTextGap}px`,
    ["--factory-load-row-label-font-size" as string]: `${config.labelFontSize}px`,
    ["--factory-load-row-label-line-height" as string]: config.labelLineHeight,
    ["--factory-load-row-value-font-size" as string]: `${config.valueFontSize}px`
  };
}

export function buildFactoryLoadRowRhythmFields({
  idPrefix,
  path
}: {
  idPrefix: string;
  path: DisplayEditorPath;
}): DisplayEditorFieldSchema[] {
  return [
    numberField({
      id: `${idPrefix}-load-row-label-font-size`,
      label: "Load Row 標籤字級",
      max: 36,
      min: 10,
      path: [...path, "labelFontSize"],
      unit: "px"
    }),
    numberField({
      id: `${idPrefix}-load-row-label-line-height`,
      label: "Load Row 標籤行高",
      max: 2,
      min: 0.8,
      path: [...path, "labelLineHeight"],
      step: 0.05
    }),
    numberField({
      id: `${idPrefix}-load-row-value-font-size`,
      label: "Load Row 數值字級",
      max: 56,
      min: 18,
      path: [...path, "valueFontSize"],
      unit: "px"
    }),
    numberField({
      id: `${idPrefix}-load-row-icon-text-gap`,
      label: "Load Row 圖文間距",
      max: 48,
      min: 0,
      path: [...path, "iconTextGap"],
      unit: "px"
    }),
    numberField({
      id: `${idPrefix}-load-row-copy-gap`,
      label: "Load Row 文字間距",
      max: 24,
      min: 0,
      path: [...path, "copyGap"],
      unit: "px"
    }),
    numberField({
      id: `${idPrefix}-load-row-horizontal-padding`,
      label: "Load Row 水平內距",
      max: 48,
      min: 0,
      path: [...path, "horizontalPadding"],
      unit: "px"
    })
  ];
}

export function createImagesCaptionRhythmConfig(
  overrides: Partial<Record<keyof ImagesCaptionRhythmConfig, unknown>> = {}
): ImagesCaptionRhythmConfig {
  return {
    bodyFontSize: boundedNumber(overrides.bodyFontSize, 19, 10, 32),
    bodyLineHeight: boundedNumber(overrides.bodyLineHeight, 1.74, 0.8, 2.4),
    bodyMarginTop: boundedNumber(overrides.bodyMarginTop, 18, 0, 40),
    metaFontSize: boundedNumber(overrides.metaFontSize, 18, 10, 28),
    metaLineHeight: boundedNumber(overrides.metaLineHeight, 1.4, 0.8, 2.4)
  };
}

export function resolveImagesCaptionRhythmConfig(
  value: unknown,
  fallback: ImagesCaptionRhythmConfig = createImagesCaptionRhythmConfig()
): ImagesCaptionRhythmConfig {
  const source = isRecord(value) ? value : {};
  const fallbackConfig = createImagesCaptionRhythmConfig(fallback);

  return createImagesCaptionRhythmConfig({
    bodyFontSize: boundedNumber(source.bodyFontSize, fallbackConfig.bodyFontSize, 10, 32),
    bodyLineHeight: boundedNumber(source.bodyLineHeight, fallbackConfig.bodyLineHeight, 0.8, 2.4),
    bodyMarginTop: boundedNumber(source.bodyMarginTop, fallbackConfig.bodyMarginTop, 0, 40),
    metaFontSize: boundedNumber(source.metaFontSize, fallbackConfig.metaFontSize, 10, 28),
    metaLineHeight: boundedNumber(source.metaLineHeight, fallbackConfig.metaLineHeight, 0.8, 2.4)
  });
}

export function buildImagesCaptionRhythmStyle(config: ImagesCaptionRhythmConfig): CSSProperties {
  return {
    ["--images-caption-body-font-size" as string]: `${config.bodyFontSize}px`,
    ["--images-caption-body-line-height" as string]: config.bodyLineHeight,
    ["--images-caption-body-margin-top" as string]: `${config.bodyMarginTop}px`,
    ["--images-caption-meta-font-size" as string]: `${config.metaFontSize}px`,
    ["--images-caption-meta-line-height" as string]: config.metaLineHeight
  };
}

export function buildImagesCaptionRhythmFields({
  idPrefix,
  path
}: {
  idPrefix: string;
  path: DisplayEditorPath;
}): DisplayEditorFieldSchema[] {
  return [
    numberField({
      id: `${idPrefix}-caption-body-font-size`,
      label: "Caption Body 字級",
      max: 32,
      min: 10,
      path: [...path, "bodyFontSize"],
      unit: "px"
    }),
    numberField({
      id: `${idPrefix}-caption-body-line-height`,
      label: "Caption Body 行高",
      max: 2.4,
      min: 0.8,
      path: [...path, "bodyLineHeight"],
      step: 0.05
    }),
    numberField({
      id: `${idPrefix}-caption-body-margin-top`,
      label: "Caption Body 上距",
      max: 40,
      min: 0,
      path: [...path, "bodyMarginTop"],
      unit: "px"
    }),
    numberField({
      id: `${idPrefix}-caption-meta-font-size`,
      label: "Caption Meta 字級",
      max: 28,
      min: 10,
      path: [...path, "metaFontSize"],
      unit: "px"
    }),
    numberField({
      id: `${idPrefix}-caption-meta-line-height`,
      label: "Caption Meta 行高",
      max: 2.4,
      min: 0.8,
      path: [...path, "metaLineHeight"],
      step: 0.05
    })
  ];
}

export function createSustainabilityHighlightRhythmConfig(
  overrides: Partial<Record<keyof SustainabilityHighlightRhythmConfig, unknown>> = {}
): SustainabilityHighlightRhythmConfig {
  return {
    cardPaddingX: boundedNumber(overrides.cardPaddingX, 16, 0, 40),
    cardPaddingY: boundedNumber(overrides.cardPaddingY, 14, 0, 40),
    labelFontSize: boundedNumber(overrides.labelFontSize, 13, 10, 24),
    labelMarginTop: boundedNumber(overrides.labelMarginTop, 8, 0, 24),
    unitFontSize: boundedNumber(overrides.unitFontSize, 14, 10, 28),
    valueFontSize: boundedNumber(overrides.valueFontSize, 30, 16, 56)
  };
}

export function resolveSustainabilityHighlightRhythmConfig(
  value: unknown,
  fallback: SustainabilityHighlightRhythmConfig = createSustainabilityHighlightRhythmConfig()
): SustainabilityHighlightRhythmConfig {
  const source = isRecord(value) ? value : {};
  const fallbackConfig = createSustainabilityHighlightRhythmConfig(fallback);

  return createSustainabilityHighlightRhythmConfig({
    cardPaddingX: boundedNumber(source.cardPaddingX, fallbackConfig.cardPaddingX, 0, 40),
    cardPaddingY: boundedNumber(source.cardPaddingY, fallbackConfig.cardPaddingY, 0, 40),
    labelFontSize: boundedNumber(source.labelFontSize, fallbackConfig.labelFontSize, 10, 24),
    labelMarginTop: boundedNumber(source.labelMarginTop, fallbackConfig.labelMarginTop, 0, 24),
    unitFontSize: boundedNumber(source.unitFontSize, fallbackConfig.unitFontSize, 10, 28),
    valueFontSize: boundedNumber(source.valueFontSize, fallbackConfig.valueFontSize, 16, 56)
  });
}

export function buildSustainabilityHighlightRhythmStyle(config: SustainabilityHighlightRhythmConfig): CSSProperties {
  return {
    ["--sustainability-highlight-card-padding" as string]: `${config.cardPaddingY}px ${config.cardPaddingX}px`,
    ["--sustainability-highlight-label-font-size" as string]: `${config.labelFontSize}px`,
    ["--sustainability-highlight-label-margin-top" as string]: `${config.labelMarginTop}px`,
    ["--sustainability-highlight-unit-font-size" as string]: `${config.unitFontSize}px`,
    ["--sustainability-highlight-value-font-size" as string]: `${config.valueFontSize}px`
  };
}

export function buildSustainabilityHighlightRhythmFields({
  idPrefix,
  path
}: {
  idPrefix: string;
  path: DisplayEditorPath;
}): DisplayEditorFieldSchema[] {
  return [
    numberField({
      id: `${idPrefix}-highlight-card-padding-x`,
      label: "Highlight Card 水平內距",
      max: 40,
      min: 0,
      path: [...path, "cardPaddingX"],
      unit: "px"
    }),
    numberField({
      id: `${idPrefix}-highlight-card-padding-y`,
      label: "Highlight Card 垂直內距",
      max: 40,
      min: 0,
      path: [...path, "cardPaddingY"],
      unit: "px"
    }),
    numberField({
      id: `${idPrefix}-highlight-value-font-size`,
      label: "Highlight 數值字級",
      max: 56,
      min: 16,
      path: [...path, "valueFontSize"],
      unit: "px"
    }),
    numberField({
      id: `${idPrefix}-highlight-unit-font-size`,
      label: "Highlight 單位字級",
      max: 28,
      min: 10,
      path: [...path, "unitFontSize"],
      unit: "px"
    }),
    numberField({
      id: `${idPrefix}-highlight-label-font-size`,
      label: "Highlight 標籤字級",
      max: 24,
      min: 10,
      path: [...path, "labelFontSize"],
      unit: "px"
    }),
    numberField({
      id: `${idPrefix}-highlight-label-margin-top`,
      label: "Highlight 標籤上距",
      max: 24,
      min: 0,
      path: [...path, "labelMarginTop"],
      unit: "px"
    })
  ];
}
