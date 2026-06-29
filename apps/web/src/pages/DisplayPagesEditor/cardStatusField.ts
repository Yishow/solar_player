import { displayPageCardStatuses } from "@solar-display/shared";
import type {
  DisplayEditorFieldSchema,
  DisplayEditorPath,
  DisplayEditorSelectOption
} from "../../../../../packages/shared/src/displayEditorSchema";

const statusOptionLabels: Record<(typeof displayPageCardStatuses)[number], string> = {
  configuring: "設置中",
  normal: "正常"
};

export const displayCardStatusSelectOptions: DisplayEditorSelectOption[] = displayPageCardStatuses.map(
  (value) => ({ label: statusOptionLabels[value], value })
);

export function buildCardVisibilityField(
  id: string,
  path: DisplayEditorPath
): DisplayEditorFieldSchema {
  return { fieldType: "toggle", id, label: "顯示", path };
}

export function buildCardStatusField(
  id: string,
  path: DisplayEditorPath
): DisplayEditorFieldSchema {
  return {
    fieldType: "select",
    id,
    label: "狀態",
    options: displayCardStatusSelectOptions,
    path
  };
}
