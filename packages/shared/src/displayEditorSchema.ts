export type DisplayEditorPath = Array<number | string>;

export type DisplayEditorOptionValue = boolean | number | string;

export type DisplayEditorFieldConstraint = {
  max?: number;
  maxLength?: number;
  min?: number;
  minLength?: number;
  required?: boolean;
};

type DisplayEditorFieldBase = {
  description?: string;
  group?: string;
  id: string;
  label: string;
  path: DisplayEditorPath;
  resettable?: boolean;
};

export type DisplayEditorTextFieldSchema = DisplayEditorFieldBase & {
  constraints?: DisplayEditorFieldConstraint;
  fieldType: "text";
  placeholder?: string;
};

export type DisplayEditorNumberFieldSchema = DisplayEditorFieldBase & {
  constraints?: DisplayEditorFieldConstraint;
  fieldType: "number";
  step?: number;
  unit?: string;
};

export type DisplayEditorToggleFieldSchema = DisplayEditorFieldBase & {
  fieldType: "toggle";
};

export type DisplayEditorSelectOption = {
  label: string;
  value: DisplayEditorOptionValue;
};

export type DisplayEditorSelectFieldSchema = DisplayEditorFieldBase & {
  fieldType: "select";
  options: DisplayEditorSelectOption[];
};

export type DisplayEditorAssetFieldSchema = DisplayEditorFieldBase & {
  fieldType: "asset";
};

export type DisplayEditorArrayItemFieldSchema =
  | DisplayEditorAssetFieldSchema
  | DisplayEditorNumberFieldSchema
  | DisplayEditorSelectFieldSchema
  | DisplayEditorTextFieldSchema
  | DisplayEditorToggleFieldSchema;

export type DisplayEditorArrayFieldSchema = DisplayEditorFieldBase & {
  fieldType: "array";
  itemFields: DisplayEditorArrayItemFieldSchema[];
  itemLabel: string;
};

export type DisplayEditorUnknownFieldSchema = DisplayEditorFieldBase & {
  fieldType: string;
};

export type DisplayEditorFieldSchema =
  | DisplayEditorArrayFieldSchema
  | DisplayEditorAssetFieldSchema
  | DisplayEditorNumberFieldSchema
  | DisplayEditorSelectFieldSchema
  | DisplayEditorTextFieldSchema
  | DisplayEditorToggleFieldSchema
  | DisplayEditorUnknownFieldSchema;

export type DisplayEditorRegionGeometrySchema = {
  compatibilityKey?: string;
  fallbackHeight?: number;
  heightPath?: DisplayEditorPath;
  leftPath: DisplayEditorPath;
  maxHeight?: number;
  maxWidth?: number;
  minHeight?: number;
  minWidth?: number;
  resizeMode?: "both" | "horizontal" | "none" | "vertical";
  topOffset?: number;
  topPath: DisplayEditorPath;
  widthPath: DisplayEditorPath;
};

export type DisplayEditorRegionSchema = {
  description?: string;
  fields: DisplayEditorFieldSchema[];
  geometry?: DisplayEditorRegionGeometrySchema;
  id: string;
  label: string;
  presetKey?: string;
};

export function displayEditorPathKey(path: DisplayEditorPath) {
  return path.join(".");
}
