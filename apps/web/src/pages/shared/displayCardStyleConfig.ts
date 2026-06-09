import type { CSSProperties } from "react";
import type { DisplayEditorFieldSchema, DisplayEditorPath } from "../../../../../packages/shared/src/displayEditorSchema";

export type DisplayCardValueRowAlign = "center" | "end" | "start";

export type DisplayCardIconChipShape = "circle" | "rounded-square";

const DEFAULT_ICON_CHIP_BACKGROUND = "rgba(255, 255, 255, 0.72)";
const DEFAULT_ICON_CHIP_FOREGROUND = "var(--display-emphasis-green)";

export type DisplayCardStyleConfig = {
  cornerRadius: number;
  footerPaddingTop: number;
  headerGap: number;
  iconBoxSize: number;
  iconChipBackground: string;
  iconChipForeground: string;
  iconChipShape: DisplayCardIconChipShape;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  shadowStrength: number;
  subtitleFontSize: number;
  surfaceBlur: number;
  surfaceOpacity: number;
  titleFontSize: number;
  trendHeight: number;
  unitFontSize: number;
  unitPaddingBottom: number;
  valueFontSize: number;
  valueMarginTop: number;
  valueRowAlign: DisplayCardValueRowAlign;
};

export const displayCardValueRowAlignOptions = [
  { label: "Start", value: "start" },
  { label: "Center", value: "center" },
  { label: "End", value: "end" }
] as const;

function resolveNonNegativeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function resolveUnitInterval(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : fallback;
}

function resolveValueRowAlign(value: unknown, fallback: DisplayCardValueRowAlign): DisplayCardValueRowAlign {
  return value === "center" || value === "start" || value === "end" ? value : fallback;
}

function resolveIconChipShape(value: unknown, fallback: DisplayCardIconChipShape): DisplayCardIconChipShape {
  return value === "circle" || value === "rounded-square" ? value : fallback;
}

function resolveIconChipColor(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function resolveIconChipRadius(shape: DisplayCardIconChipShape) {
  return shape === "rounded-square" ? "30%" : "50%";
}

function resolveTextAlign(value: DisplayCardValueRowAlign) {
  if (value === "center") {
    return "center";
  }

  return value === "end" ? "right" : "left";
}

function resolveFlexAlign(value: DisplayCardValueRowAlign) {
  if (value === "center") {
    return "center";
  }

  return value === "end" ? "flex-end" : "flex-start";
}

export function createDisplayCardStyleConfig(
  overrides: Partial<Record<keyof DisplayCardStyleConfig, unknown>> = {}
): DisplayCardStyleConfig {
  return {
    cornerRadius: resolveNonNegativeNumber(overrides.cornerRadius, 26),
    footerPaddingTop: resolveNonNegativeNumber(overrides.footerPaddingTop, 18),
    headerGap: resolveNonNegativeNumber(overrides.headerGap, 16),
    iconBoxSize: resolveNonNegativeNumber(overrides.iconBoxSize, 58),
    iconChipBackground: resolveIconChipColor(overrides.iconChipBackground, DEFAULT_ICON_CHIP_BACKGROUND),
    iconChipForeground: resolveIconChipColor(overrides.iconChipForeground, DEFAULT_ICON_CHIP_FOREGROUND),
    iconChipShape: resolveIconChipShape(overrides.iconChipShape, "circle"),
    paddingBottom: resolveNonNegativeNumber(overrides.paddingBottom, 20),
    paddingLeft: resolveNonNegativeNumber(overrides.paddingLeft, 26),
    paddingRight: resolveNonNegativeNumber(overrides.paddingRight, 26),
    paddingTop: resolveNonNegativeNumber(overrides.paddingTop, 26),
    shadowStrength: resolveNonNegativeNumber(overrides.shadowStrength, 1),
    subtitleFontSize: resolveNonNegativeNumber(overrides.subtitleFontSize, 14),
    surfaceBlur: resolveNonNegativeNumber(overrides.surfaceBlur, 0),
    surfaceOpacity: resolveUnitInterval(overrides.surfaceOpacity, 1),
    titleFontSize: resolveNonNegativeNumber(overrides.titleFontSize, 20),
    trendHeight: resolveNonNegativeNumber(overrides.trendHeight, 56),
    unitFontSize: resolveNonNegativeNumber(overrides.unitFontSize, 16),
    unitPaddingBottom: resolveNonNegativeNumber(overrides.unitPaddingBottom, 6),
    valueFontSize: resolveNonNegativeNumber(overrides.valueFontSize, 54),
    valueMarginTop: resolveNonNegativeNumber(overrides.valueMarginTop, 28),
    valueRowAlign: resolveValueRowAlign(overrides.valueRowAlign, "start")
  };
}

export function buildDisplayCardStyleVars(cardStyle: DisplayCardStyleConfig): CSSProperties {
  const textAlign = resolveTextAlign(cardStyle.valueRowAlign);
  const flexAlign = resolveFlexAlign(cardStyle.valueRowAlign);

  return {
    ["--display-card-footer-padding-top" as string]: `${cardStyle.footerPaddingTop}px`,
    ["--display-card-flex-align" as string]: flexAlign,
    ["--display-card-flex-justify" as string]: flexAlign,
    ["--display-card-header-gap" as string]: `${cardStyle.headerGap}px`,
    ["--display-card-icon-box-size" as string]: `${cardStyle.iconBoxSize}px`,
    ["--display-card-icon-chip-bg" as string]: cardStyle.iconChipBackground,
    ["--display-card-icon-chip-fg" as string]: cardStyle.iconChipForeground,
    ["--display-card-icon-chip-radius" as string]: resolveIconChipRadius(cardStyle.iconChipShape),
    ["--display-card-padding" as string]: `${cardStyle.paddingTop}px ${cardStyle.paddingRight}px ${cardStyle.paddingBottom}px ${cardStyle.paddingLeft}px`,
    ["--display-card-radius" as string]: `${cardStyle.cornerRadius}px`,
    ["--display-card-shadow-strength" as string]: `${cardStyle.shadowStrength}`,
    ["--display-card-subtitle-size" as string]: `${cardStyle.subtitleFontSize}px`,
    ["--display-card-surface-blur" as string]: `${cardStyle.surfaceBlur}px`,
    ["--display-card-surface-opacity" as string]: `${cardStyle.surfaceOpacity}`,
    ["--display-card-text-align" as string]: textAlign,
    ["--display-card-title-size" as string]: `${cardStyle.titleFontSize}px`,
    ["--display-card-trend-height" as string]: `${cardStyle.trendHeight}px`,
    ["--display-card-unit-padding-bottom" as string]: `${cardStyle.unitPaddingBottom}px`,
    ["--display-card-unit-size" as string]: `${cardStyle.unitFontSize}px`,
    ["--display-card-value-margin-top" as string]: `${cardStyle.valueMarginTop}px`,
    ["--display-card-value-size" as string]: `${cardStyle.valueFontSize}px`
  };
}

export function buildDisplayCardStyleFields({
  idPrefix,
  path
}: {
  idPrefix: string;
  path: DisplayEditorPath;
}): DisplayEditorFieldSchema[] {
  return [
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-title-font-size`,
      label: "Title Font Size",
      path: [...path, "titleFontSize"]
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-subtitle-font-size`,
      label: "Subtitle Font Size",
      path: [...path, "subtitleFontSize"]
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-value-font-size`,
      label: "Value Font Size",
      path: [...path, "valueFontSize"]
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-unit-font-size`,
      label: "Unit Font Size",
      path: [...path, "unitFontSize"]
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-padding-top`,
      label: "Padding Top",
      path: [...path, "paddingTop"]
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-padding-right`,
      label: "Padding Right",
      path: [...path, "paddingRight"]
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-padding-bottom`,
      label: "Padding Bottom",
      path: [...path, "paddingBottom"]
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-padding-left`,
      label: "Padding Left",
      path: [...path, "paddingLeft"]
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-corner-radius`,
      label: "Corner Radius",
      path: [...path, "cornerRadius"]
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-header-gap`,
      label: "Header Gap",
      path: [...path, "headerGap"]
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-icon-box-size`,
      label: "Icon Box Size",
      path: [...path, "iconBoxSize"]
    },
    {
      fieldType: "text",
      id: `${idPrefix}-card-icon-chip-background`,
      label: "Icon Chip Background",
      path: [...path, "iconChipBackground"]
    },
    {
      fieldType: "text",
      id: `${idPrefix}-card-icon-chip-foreground`,
      label: "Icon Chip Foreground",
      path: [...path, "iconChipForeground"]
    },
    {
      fieldType: "select",
      id: `${idPrefix}-card-icon-chip-shape`,
      label: "Icon Chip Shape",
      options: [
        { label: "Circle", value: "circle" },
        { label: "Rounded Square", value: "rounded-square" }
      ],
      path: [...path, "iconChipShape"]
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-footer-padding-top`,
      label: "Footer Padding Top",
      path: [...path, "footerPaddingTop"]
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-value-margin-top`,
      label: "Value Margin Top",
      path: [...path, "valueMarginTop"]
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-trend-height`,
      label: "Trend Height",
      path: [...path, "trendHeight"]
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-unit-padding-bottom`,
      label: "Unit Padding Bottom",
      path: [...path, "unitPaddingBottom"]
    },
    {
      constraints: { max: 1, min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-surface-opacity`,
      label: "Surface Opacity",
      path: [...path, "surfaceOpacity"],
      step: 0.02
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-surface-blur`,
      label: "Surface Blur",
      path: [...path, "surfaceBlur"]
    },
    {
      constraints: { min: 0 },
      fieldType: "number",
      id: `${idPrefix}-card-shadow-strength`,
      label: "Shadow Strength",
      path: [...path, "shadowStrength"],
      step: 0.1
    },
    {
      fieldType: "select",
      id: `${idPrefix}-card-value-row-align`,
      label: "Value Row Align",
      options: displayCardValueRowAlignOptions.map((option) => ({
        label: option.label,
        value: option.value
      })),
      path: [...path, "valueRowAlign"]
    }
  ];
}
