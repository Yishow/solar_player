import type {
  DisplayEditorFieldSchema,
  DisplayEditorPath,
  DisplayEditorRegionSchema
} from "../../../../../packages/shared/src/displayEditorSchema";
import type {
  DisplayPageCardRailCard,
  DisplayPageCardRailTemplateKey
} from "@solar-display/shared";

function numberField(
  id: string,
  label: string,
  path: DisplayEditorPath,
  min = 0
): DisplayEditorFieldSchema {
  return {
    constraints: { min },
    fieldType: "number",
    id,
    label,
    path
  };
}

function textField(
  id: string,
  label: string,
  path: DisplayEditorPath,
  required = false
): DisplayEditorFieldSchema {
  return {
    constraints: required ? { required: true } : undefined,
    fieldType: "text",
    id,
    label,
    path
  };
}

export function resolveCardRailTemplateLabel(template: DisplayPageCardRailTemplateKey) {
  return template === "household-equivalent" ? "Household Equivalent" : "Metric Highlight";
}

export function resolveCardRailCardLabel(card: DisplayPageCardRailCard) {
  if (card.template === "household-equivalent") {
    return card.contentSource.payload.eyebrow;
  }

  return card.contentSource.payload.label;
}

export function buildCardRailCardRegionSchema(args: {
  cardPath: DisplayEditorPath;
  id: string;
  label: string;
}): DisplayEditorRegionSchema {
  const { cardPath } = args;
  return {
    description: "調整 rail card 的模板內容與幾何。",
    fields: [],
    geometry: {
      compatibilityKey: "card-rail-card",
      heightPath: [...cardPath, "frame", "height"],
      leftPath: [...cardPath, "frame", "left"],
      minHeight: 64,
      minWidth: 120,
      resizeMode: "both",
      topPath: [...cardPath, "frame", "top"],
      widthPath: [...cardPath, "frame", "width"]
    },
    id: args.id,
    label: args.label
  };
}

export function buildCardRailCardFields(
  card: DisplayPageCardRailCard,
  cardPath: DisplayEditorPath
): DisplayEditorFieldSchema[] {
  const contentPath = [...cardPath, "contentSource", "payload"];
  const geometryFields = [
    numberField("card-frame-left", "Card Left", [...cardPath, "frame", "left"]),
    numberField("card-frame-top", "Card Top", [...cardPath, "frame", "top"]),
    numberField("card-frame-width", "Card Width", [...cardPath, "frame", "width"], 1),
    numberField("card-frame-height", "Card Height", [...cardPath, "frame", "height"], 1)
  ];

  if (card.template === "household-equivalent") {
    return [
      textField("card-eyebrow", "Eyebrow", [...contentPath, "eyebrow"], true),
      textField(
        "card-household-count-display",
        "Household Count Display",
        [...contentPath, "householdCountDisplay"],
        true
      ),
      textField("card-household-label", "Household Label", [...contentPath, "householdLabel"], true),
      textField("card-supporting-line", "Supporting Line", [...contentPath, "supportingLine"], true),
      textField("card-disclaimer", "Disclaimer", [...contentPath, "disclaimer"], true),
      textField("card-basis-source-label", "Basis Source Label", [...contentPath, "basisSourceLabel"], true),
      ...geometryFields
    ];
  }

  return [
    textField("card-label", "Label", [...contentPath, "label"], true),
    textField("card-value", "Value", [...contentPath, "value"], true),
    textField("card-unit", "Unit", [...contentPath, "unit"], true),
    ...geometryFields
  ];
}
