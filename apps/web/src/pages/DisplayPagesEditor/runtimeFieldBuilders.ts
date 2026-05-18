import type { DisplayPageMediaBinding } from "@solar-display/shared";

const CONTENT_TOP_OFFSET = 146;

type DisplayEditorField = {
  id: string;
  label: string;
  onChange: (value: string) => void;
  step?: number;
  type: "number" | "text";
  value: number | string;
};

export type UpdatePath = (path: Array<number | string>, value: unknown) => void;

export function toContentTop(value: number) {
  return value - CONTENT_TOP_OFFSET;
}

export function textField(
  id: string,
  label: string,
  value: string,
  path: Array<number | string>,
  updatePath: UpdatePath
): DisplayEditorField {
  return {
    id,
    label,
    onChange: (nextValue) => updatePath(path, nextValue),
    type: "text",
    value
  };
}

export function numberField(
  id: string,
  label: string,
  value: number,
  path: Array<number | string>,
  updatePath: UpdatePath,
  step = 1
): DisplayEditorField {
  return {
    id,
    label,
    onChange: (nextValue) => updatePath(path, Number(nextValue)),
    step,
    type: "number",
    value
  };
}

export function mediaPlacementFields(
  prefix: string,
  bindingPath: Array<number | string>,
  binding: DisplayPageMediaBinding,
  updatePath: UpdatePath
) {
  return [
    textField(
      `${prefix}-fit-mode`,
      "Fit Mode (contain | cover)",
      binding.fitMode ?? "cover",
      [...bindingPath, "fitMode"],
      updatePath
    ),
    numberField(
      `${prefix}-focus-x`,
      "Focus X (0-1)",
      binding.focusX ?? 0.5,
      [...bindingPath, "focusX"],
      updatePath,
      0.05
    ),
    numberField(
      `${prefix}-focus-y`,
      "Focus Y (0-1)",
      binding.focusY ?? 0.5,
      [...bindingPath, "focusY"],
      updatePath,
      0.05
    ),
    numberField(
      `${prefix}-align-x`,
      "Align X",
      binding.alignX ?? 0.5,
      [...bindingPath, "alignX"],
      updatePath,
      0.05
    ),
    numberField(
      `${prefix}-align-y`,
      "Align Y",
      binding.alignY ?? 0.5,
      [...bindingPath, "alignY"],
      updatePath,
      0.05
    )
  ];
}
