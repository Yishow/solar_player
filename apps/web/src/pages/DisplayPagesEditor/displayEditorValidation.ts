import type {
  DisplayEditorArrayFieldSchema,
  DisplayEditorFieldConstraint,
  DisplayEditorFieldSchema,
  DisplayEditorSelectFieldSchema
} from "../../../../../packages/shared/src/displayEditorSchema";
import { getValueAtPath } from "../../hooks/displayPageConfigPaths";

function validateStringField(
  label: string,
  value: unknown,
  constraints?: DisplayEditorFieldConstraint
) {
  const issues: string[] = [];
  const normalizedValue = typeof value === "string" ? value : "";

  if (constraints?.required && normalizedValue.trim().length === 0) {
    issues.push(`${label} 為必填欄位。`);
  }
  if (constraints?.minLength !== undefined && normalizedValue.length < constraints.minLength) {
    issues.push(`${label} 至少需要 ${constraints.minLength} 個字元。`);
  }
  if (constraints?.maxLength !== undefined && normalizedValue.length > constraints.maxLength) {
    issues.push(`${label} 不可超過 ${constraints.maxLength} 個字元。`);
  }

  return issues;
}

function validateNumberField(
  label: string,
  value: unknown,
  constraints?: DisplayEditorFieldConstraint
) {
  const issues: string[] = [];

  if (typeof value !== "number" || Number.isNaN(value)) {
    issues.push(`${label} 必須是數字。`);
    return issues;
  }
  if (constraints?.min !== undefined && value < constraints.min) {
    issues.push(`${label} 必須大於或等於 ${constraints.min}。`);
  }
  if (constraints?.max !== undefined && value > constraints.max) {
    issues.push(`${label} 必須小於或等於 ${constraints.max}。`);
  }

  return issues;
}

function validateSelectField(
  schema: DisplayEditorSelectFieldSchema,
  value: unknown
) {
  const optionValues = new Set(schema.options.map((option) => option.value));
  if (!optionValues.has(value as boolean | number | string)) {
    return [`${schema.label} 的值與可用選項不相容。`];
  }

  return [];
}

function validateArrayField(schema: DisplayEditorArrayFieldSchema, value: unknown) {
  if (!Array.isArray(value)) {
    return [`${schema.label} 必須是陣列。`];
  }

  const issues: string[] = [];
  value.forEach((item, index) => {
    schema.itemFields.forEach((field) => {
      const itemValue = getValueAtPath(item, field.path);
      const nestedIssues = resolveDisplayEditorFieldValidationIssues(field, itemValue);
      nestedIssues.forEach((issue) => {
        issues.push(`${schema.itemLabel} ${index + 1}: ${issue}`);
      });
    });
  });

  return issues;
}

export function resolveDisplayEditorFieldValidationIssues(
  schema: DisplayEditorFieldSchema,
  value: unknown
): string[] {
  if (schema.fieldType === "number") {
    return validateNumberField(
      schema.label,
      value,
      "constraints" in schema ? schema.constraints : undefined
    );
  }
  if (schema.fieldType === "text" || schema.fieldType === "asset") {
    return validateStringField(
      schema.label,
      value,
      "constraints" in schema ? schema.constraints : undefined
    );
  }
  if (schema.fieldType === "select" && "options" in schema) {
    return validateSelectField(schema, value);
  }
  if (schema.fieldType === "array" && "itemFields" in schema) {
    return validateArrayField(schema, value);
  }

  return [];
}
