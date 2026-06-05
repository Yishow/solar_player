import type { CSSProperties } from "react";
import type { DisplayEditorFieldSchema, DisplayEditorPath } from "../../../../../packages/shared/src/displayEditorSchema";

export type FlowConnectorLineCap = "butt" | "round" | "square";

export type FlowConnectorTreatmentConfig = {
  lineCap: FlowConnectorLineCap;
  opacity: number;
  radius: number;
  strokeWidth: number;
  zIndex: number;
};

export type FlowNodeValueAlign = "center" | "left" | "right";

export type FlowNodeTreatmentConfig = {
  iconLabelGap: number;
  iconScale: number;
  valueAlign: FlowNodeValueAlign;
};

type ConnectorTreatmentFieldSupport = Partial<Record<keyof FlowConnectorTreatmentConfig, boolean>>;
type NodeTreatmentFieldSupport = Partial<Record<keyof FlowNodeTreatmentConfig, boolean>>;

const connectorLineCapOptions = [
  { label: "Butt", value: "butt" },
  { label: "Round", value: "round" },
  { label: "Square", value: "square" }
] as const;

const flowNodeValueAlignOptions = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" }
] as const;

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function resolveLineCap(value: unknown, fallback: FlowConnectorLineCap): FlowConnectorLineCap {
  return value === "butt" || value === "round" || value === "square" ? value : fallback;
}

function resolveValueAlign(value: unknown, fallback: FlowNodeValueAlign): FlowNodeValueAlign {
  return value === "center" || value === "left" || value === "right" ? value : fallback;
}

export function createFlowConnectorTreatmentConfig(
  overrides: Partial<Record<keyof FlowConnectorTreatmentConfig, unknown>> = {}
): FlowConnectorTreatmentConfig {
  return {
    lineCap: resolveLineCap(overrides.lineCap, "round"),
    opacity: boundedNumber(overrides.opacity, 1, 0, 1),
    radius: boundedNumber(overrides.radius, 5, 0, 48),
    strokeWidth: boundedNumber(overrides.strokeWidth, 9, 1, 32),
    zIndex: boundedNumber(overrides.zIndex, 10, 0, 30)
  };
}

export function resolveFlowConnectorTreatmentConfig(
  value: unknown,
  fallback: FlowConnectorTreatmentConfig = createFlowConnectorTreatmentConfig()
): FlowConnectorTreatmentConfig {
  const fallbackConfig = createFlowConnectorTreatmentConfig(fallback);
  const source = isRecord(value) ? value : {};

  return {
    lineCap: resolveLineCap(source.lineCap, fallbackConfig.lineCap),
    opacity: boundedNumber(source.opacity, fallbackConfig.opacity, 0, 1),
    radius: boundedNumber(source.radius, fallbackConfig.radius, 0, 48),
    strokeWidth: boundedNumber(source.strokeWidth, fallbackConfig.strokeWidth, 1, 32),
    zIndex: boundedNumber(source.zIndex, fallbackConfig.zIndex, 0, 30)
  };
}

export function createFlowNodeTreatmentConfig(
  overrides: Partial<Record<keyof FlowNodeTreatmentConfig, unknown>> = {}
): FlowNodeTreatmentConfig {
  return {
    iconLabelGap: boundedNumber(overrides.iconLabelGap, 0, -80, 120),
    iconScale: boundedNumber(overrides.iconScale, 1, 0.5, 1.8),
    valueAlign: resolveValueAlign(overrides.valueAlign, "center")
  };
}

export function resolveFlowNodeTreatmentConfig(
  value: unknown,
  fallback: FlowNodeTreatmentConfig = createFlowNodeTreatmentConfig()
): FlowNodeTreatmentConfig {
  const fallbackConfig = createFlowNodeTreatmentConfig(fallback);
  const source = isRecord(value) ? value : {};

  return {
    iconLabelGap: boundedNumber(source.iconLabelGap, fallbackConfig.iconLabelGap, -80, 120),
    iconScale: boundedNumber(source.iconScale, fallbackConfig.iconScale, 0.5, 1.8),
    valueAlign: resolveValueAlign(source.valueAlign, fallbackConfig.valueAlign)
  };
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
    group: "Flow Treatment",
    id,
    label,
    path,
    resettable: true,
    step,
    ...(unit ? { unit } : {})
  };
}

export function buildFlowConnectorTreatmentFields({
  idPrefix,
  path,
  support = {}
}: {
  idPrefix: string;
  path: DisplayEditorPath;
  support?: ConnectorTreatmentFieldSupport;
}): DisplayEditorFieldSchema[] {
  const resolvedSupport: Required<ConnectorTreatmentFieldSupport> = {
    lineCap: true,
    opacity: true,
    radius: true,
    strokeWidth: true,
    zIndex: true,
    ...support
  };
  const fields: DisplayEditorFieldSchema[] = [];

  if (resolvedSupport.strokeWidth) {
    fields.push(numberField({
      id: `${idPrefix}-connector-stroke-width`,
      label: "Connector Stroke Width",
      max: 32,
      min: 1,
      path: [...path, "strokeWidth"],
      unit: "px"
    }));
  }
  if (resolvedSupport.opacity) {
    fields.push(numberField({
      id: `${idPrefix}-connector-opacity`,
      label: "Connector Opacity",
      max: 1,
      min: 0,
      path: [...path, "opacity"],
      step: 0.05
    }));
  }
  if (resolvedSupport.lineCap) {
    fields.push({
      fieldType: "select",
      group: "Flow Treatment",
      id: `${idPrefix}-connector-line-cap`,
      label: "Connector Line Cap",
      options: connectorLineCapOptions.map((option) => ({ ...option })),
      path: [...path, "lineCap"],
      resettable: true
    });
  }
  if (resolvedSupport.radius) {
    fields.push(numberField({
      id: `${idPrefix}-connector-radius`,
      label: "Connector Radius",
      max: 48,
      min: 0,
      path: [...path, "radius"],
      unit: "px"
    }));
  }
  if (resolvedSupport.zIndex) {
    fields.push(numberField({
      id: `${idPrefix}-connector-layer`,
      label: "Connector Layer",
      max: 30,
      min: 0,
      path: [...path, "zIndex"]
    }));
  }

  return fields;
}

export function buildFlowNodeTreatmentFields({
  idPrefix,
  path,
  support = {}
}: {
  idPrefix: string;
  path: DisplayEditorPath;
  support?: NodeTreatmentFieldSupport;
}): DisplayEditorFieldSchema[] {
  const resolvedSupport: Required<NodeTreatmentFieldSupport> = {
    iconLabelGap: true,
    iconScale: true,
    valueAlign: true,
    ...support
  };
  const fields: DisplayEditorFieldSchema[] = [];

  if (resolvedSupport.iconScale) {
    fields.push(numberField({
      id: `${idPrefix}-node-icon-scale`,
      label: "Node Icon Scale",
      max: 1.8,
      min: 0.5,
      path: [...path, "iconScale"],
      step: 0.05
    }));
  }
  if (resolvedSupport.iconLabelGap) {
    fields.push(numberField({
      id: `${idPrefix}-node-icon-label-gap`,
      label: "Node Icon Label Gap",
      max: 120,
      min: -80,
      path: [...path, "iconLabelGap"],
      unit: "px"
    }));
  }
  if (resolvedSupport.valueAlign) {
    fields.push({
      fieldType: "select",
      group: "Flow Treatment",
      id: `${idPrefix}-node-value-align`,
      label: "Node Value Align",
      options: flowNodeValueAlignOptions.map((option) => ({ ...option })),
      path: [...path, "valueAlign"],
      resettable: true
    });
  }

  return fields;
}

export function buildFlowConnectorTreatmentStyle(
  treatment: FlowConnectorTreatmentConfig
): CSSProperties {
  return {
    borderRadius: `${treatment.radius}px`,
    opacity: treatment.opacity,
    zIndex: treatment.zIndex,
    ["--display-flow-connector-line-cap" as string]: treatment.lineCap,
    ["--display-flow-connector-stroke-width" as string]: `${treatment.strokeWidth}px`
  };
}

export function buildFlowNodeTreatmentStyle(
  treatment: FlowNodeTreatmentConfig
): CSSProperties {
  return {
    textAlign: treatment.valueAlign,
    ["--display-flow-node-icon-label-gap" as string]: `${treatment.iconLabelGap}px`,
    ["--display-flow-node-icon-scale" as string]: String(treatment.iconScale),
    ["--display-flow-node-value-align" as string]: treatment.valueAlign
  };
}
