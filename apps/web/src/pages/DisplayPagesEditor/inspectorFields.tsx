import React from "react";
import type { ReactNode } from "react";
import {
  displayEditorPathKey,
  type DisplayEditorArrayFieldSchema,
  type DisplayEditorFieldSchema,
  type DisplayEditorNumberFieldSchema,
  type DisplayEditorPath,
  type DisplayEditorRegionSchema,
  type DisplayEditorSelectFieldSchema
} from "../../../../../packages/shared/src/displayEditorSchema";
import { getValueAtPath } from "../../hooks/displayPageConfigPaths";
import { resolveDisplayEditorFieldValidationIssues } from "./displayEditorValidation";

export type ResolvedDisplayEditorRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type ResolvedDisplayEditorField = {
  dirty: boolean;
  path: DisplayEditorPath;
  schema: DisplayEditorFieldSchema;
  value: unknown;
};

export type ResolvedDisplayEditorRegion = {
  description?: string;
  fields: ResolvedDisplayEditorField[];
  geometry?: ResolvedDisplayEditorRect;
  id: string;
  label: string;
  presetKey?: string;
  schema: DisplayEditorRegionSchema;
};

export function resolveDisplayEditorFieldIssues(field: ResolvedDisplayEditorField) {
  return resolveDisplayEditorFieldValidationIssues(field.schema, field.value);
}

export function DisplayEditorCanvasOverlay({
  isInteractive,
  lockedRegionIds,
  onStartInteraction,
  regions,
  selectedRegionId,
  onSelect
}: {
  isInteractive: boolean;
  lockedRegionIds: string[];
  onSelect: (regionId: string) => void;
  onStartInteraction: (
    event: React.PointerEvent<HTMLButtonElement>,
    region: ResolvedDisplayEditorRegion,
    type: "drag" | "resize"
  ) => void;
  regions: ResolvedDisplayEditorRegion[];
  selectedRegionId: string | null;
}) {
  if (!isInteractive) {
    return null;
  }

  return (
    <>
      {regions.map((region) => {
        if (!region.geometry) {
          return null;
        }

        const isSelected = selectedRegionId === region.id;
        const isLocked = lockedRegionIds.includes(region.id);
        return (
          <div
            key={region.id}
            className="absolute rounded-[22px] border-2 transition-colors"
            data-locked={isLocked ? "true" : "false"}
            style={{
              background: isLocked
                ? "rgba(82, 91, 66, 0.1)"
                : isSelected
                  ? "rgba(95, 140, 80, 0.18)"
                  : "rgba(95, 140, 80, 0.08)",
              borderColor: isSelected ? "rgba(63, 122, 52, 0.9)" : "rgba(95, 140, 80, 0.42)",
              height: `${region.geometry.height}px`,
              left: `${region.geometry.left}px`,
              top: `${region.geometry.top}px`,
              width: `${region.geometry.width}px`,
              zIndex: 50
            }}
          >
            <button
              type="button"
              aria-pressed={isSelected}
              className="absolute inset-0"
              data-region-locked={isLocked ? "true" : "false"}
              onPointerDown={(event) => {
                event.preventDefault();
                onSelect(region.id);
                if (!isLocked) {
                  onStartInteraction(event, region, "drag");
                }
              }}
            >
              <span className="sr-only">{region.label}</span>
            </button>
            {isSelected && isLocked ? (
              <span className="absolute right-3 top-3 rounded-full bg-[rgba(82,91,66,0.82)] px-2 py-1 text-[11px] font-semibold text-white">
                Locked
              </span>
            ) : null}
            {isSelected && !isLocked ? (
              <button
                type="button"
                aria-label={`${region.label} resize handle`}
                className="absolute bottom-[-8px] right-[-8px] h-5 w-5 rounded-full border-2 border-white bg-[var(--shell-accent)]"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onStartInteraction(event, region, "resize");
                }}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function resolveDisplayEditorRegions(
  config: Record<string, unknown>,
  regionSchemas: DisplayEditorRegionSchema[],
  seedConfig: Record<string, unknown>
): ResolvedDisplayEditorRegion[] {
  return regionSchemas.map((schema) => ({
    description: schema.description,
    fields: schema.fields.map((field) => ({
      dirty: JSON.stringify(getValueAtPath(config, field.path)) !== JSON.stringify(getValueAtPath(seedConfig, field.path)),
      path: field.path,
      schema: field,
      value: getValueAtPath(config, field.path)
    })),
    geometry: resolveRegionGeometry(config, schema),
    id: schema.id,
    label: schema.label,
    presetKey: schema.presetKey,
    schema
  }));
}

export function DisplayEditorInspectorFields({
  fields,
  onChange,
  onResetField
}: {
  fields: ResolvedDisplayEditorField[];
  onChange: (path: DisplayEditorPath, value: unknown) => void;
  onResetField?: (path: DisplayEditorPath) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => renderField(field, onChange, onResetField))}
    </div>
  );
}

function renderField(
  field: ResolvedDisplayEditorField,
  onChange: (path: DisplayEditorPath, value: unknown) => void,
  onResetField?: (path: DisplayEditorPath) => void
) {
  const label = (
    <span className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 font-semibold text-[var(--shell-title-ink)]">
        {field.schema.label}
        {field.dirty ? (
          <span className="rounded-full bg-[rgba(201,136,26,0.12)] px-2 py-0.5 text-[11px] text-[#8e6410]">
            dirty
          </span>
        ) : null}
      </span>
      {field.dirty && onResetField ? (
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-2 py-1 text-[11px] font-semibold text-[var(--shell-copy-ink)]"
          onClick={() => onResetField(field.path)}
        >
          Reset Field
        </button>
      ) : null}
    </span>
  );

  if (isArrayFieldSchema(field.schema)) {
    const arraySchema = field.schema;
    const items = Array.isArray(field.value) ? field.value : [];
    return (
      <div
        key={displayEditorPathKey(field.path)}
        className="grid gap-3 rounded-[16px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.03)] p-3 md:col-span-2"
      >
        {label}
        {items.map((item, index) => (
          <div key={`${displayEditorPathKey(field.path)}-${index}`} className="grid gap-3 rounded-[14px] bg-white p-3">
            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--shell-subtitle-ink)]">
              {arraySchema.itemLabel} {index + 1}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {arraySchema.itemFields.map((itemField) =>
                renderField(
                  {
                    dirty: false,
                    path: [...field.path, index, ...itemField.path],
                    schema: itemField,
                    value: getValueAtPath(item, itemField.path)
                  },
                  onChange,
                  undefined
                )
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <label key={displayEditorPathKey(field.path)} className="grid gap-2 text-[13px] text-[var(--shell-copy-ink)]">
      {label}
      {renderFieldInput(field, onChange)}
      {resolveDisplayEditorFieldIssues(field).map((issue) => (
        <span
          key={`${displayEditorPathKey(field.path)}-${issue}`}
          className="text-[12px] text-[#8f452d]"
          role="alert"
        >
          {issue}
        </span>
      ))}
    </label>
  );
}

function renderFieldInput(
  field: ResolvedDisplayEditorField,
  onChange: (path: DisplayEditorPath, value: unknown) => void
): ReactNode {
  if (isNumberFieldSchema(field.schema)) {
    return (
      <input
        className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2 text-[14px] text-[var(--shell-title-ink)] outline-none focus:border-[var(--shell-divider-strong)]"
        step={field.schema.step}
        type="number"
        value={typeof field.value === "number" ? String(field.value) : ""}
        onChange={(event) => onChange(field.path, Number(event.target.value))}
      />
    );
  }

  if (field.schema.fieldType === "toggle") {
    return (
      <input
        checked={Boolean(field.value)}
        className="h-4 w-4"
        type="checkbox"
        onChange={(event) => onChange(field.path, event.target.checked)}
      />
    );
  }

  if (isSelectFieldSchema(field.schema)) {
    return (
      <select
        className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2 text-[14px] text-[var(--shell-title-ink)] outline-none focus:border-[var(--shell-divider-strong)]"
        value={String(field.value ?? "")}
        onChange={(event) => onChange(field.path, event.target.value)}
      >
        {field.schema.options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.schema.fieldType === "asset") {
    return (
      <input
        className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2 text-[14px] text-[var(--shell-title-ink)] outline-none focus:border-[var(--shell-divider-strong)]"
        type="text"
        value={typeof field.value === "string" ? field.value : ""}
        onChange={(event) => onChange(field.path, event.target.value)}
      />
    );
  }

  if (field.schema.fieldType === "text") {
    return (
      <input
        className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2 text-[14px] text-[var(--shell-title-ink)] outline-none focus:border-[var(--shell-divider-strong)]"
        type="text"
        value={typeof field.value === "string" ? field.value : ""}
        onChange={(event) => onChange(field.path, event.target.value)}
      />
    );
  }

  return (
    <div className="rounded-[14px] border border-dashed border-[var(--shell-divider-strong)] bg-[rgba(82,91,66,0.04)] px-3 py-2 text-[12px] text-[var(--shell-subtitle-ink)]">
      Unknown field type: {field.schema.fieldType}
    </div>
  );
}

function resolveRegionGeometry(
  config: Record<string, unknown>,
  schema: DisplayEditorRegionSchema
): ResolvedDisplayEditorRect | undefined {
  if (!schema.geometry) {
    return undefined;
  }

  const left = Number(getValueAtPath(config, schema.geometry.leftPath) ?? 0);
  const topValue = Number(getValueAtPath(config, schema.geometry.topPath) ?? 0);
  const width = Number(getValueAtPath(config, schema.geometry.widthPath) ?? 0);
  const height = schema.geometry.heightPath
    ? Number(getValueAtPath(config, schema.geometry.heightPath) ?? schema.geometry.fallbackHeight ?? 68)
    : Number(schema.geometry.fallbackHeight ?? 68);

  return {
    height,
    left,
    top: topValue - (schema.geometry.topOffset ?? 0),
    width
  };
}

function isArrayFieldSchema(schema: DisplayEditorFieldSchema): schema is DisplayEditorArrayFieldSchema {
  return schema.fieldType === "array" && "itemFields" in schema;
}

function isNumberFieldSchema(
  schema: DisplayEditorFieldSchema
): schema is DisplayEditorNumberFieldSchema {
  return schema.fieldType === "number";
}

function isSelectFieldSchema(
  schema: DisplayEditorFieldSchema
): schema is DisplayEditorSelectFieldSchema {
  return schema.fieldType === "select" && "options" in schema;
}
