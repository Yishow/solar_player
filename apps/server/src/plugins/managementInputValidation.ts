import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  displayCircuitSlotKeys,
  managedAssetCategories,
  managedAssetUsageScopes
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";

const POSITIVE_INTEGER_PATH_ID = /^[1-9][0-9]*$/;
const CIRCUIT_SLOT_SET = new Set<string>(displayCircuitSlotKeys);
const MANAGED_ASSET_CATEGORY_SET = new Set<string>(managedAssetCategories);
const MANAGED_ASSET_USAGE_SCOPE_SET = new Set<string>(managedAssetUsageScopes);
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type RecordLike = Record<string, unknown>;

type CircuitRow = {
  id: number;
  page_key: string;
  name_zh: string | null;
  name_en: string | null;
  icon: string | null;
  unit: string | null;
  mqtt_topic: string | null;
  rated_capacity: number | null;
  normal_min: number | null;
  normal_max: number | null;
  attention_min: number | null;
  attention_max: number | null;
  warning_min: number | null;
  warning_max: number | null;
  display_order: number | null;
  display_slot: string | null;
  enabled: number;
};

function isRecord(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sendBadRequest(reply: FastifyReply, error: string) {
  return reply.status(400).send({
    success: false,
    error,
    timestamp: new Date().toISOString()
  });
}

function sendNotFound(reply: FastifyReply, error: string) {
  return reply.status(404).send({
    success: false,
    error,
    timestamp: new Date().toISOString()
  });
}

export function parsePositiveIntegerPathId(value: unknown): number | null {
  if (typeof value !== "string" || !POSITIVE_INTEGER_PATH_ID.test(value)) {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function matchPathId(request: FastifyRequest): { idText: string; label: string } | null {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const method = request.method.toUpperCase();

  if ((method === "PUT" || method === "DELETE") && pathname.startsWith("/api/circuits/")) {
    const suffix = pathname.slice("/api/circuits/".length);
    if (!suffix.includes("/") && suffix !== "reorder") {
      return { idText: suffix, label: "circuit" };
    }
  }

  if ((method === "PUT" || method === "DELETE") && pathname.startsWith("/api/images/")) {
    const suffix = pathname.slice("/api/images/".length);
    if (!suffix.includes("/") && suffix !== "reorder" && suffix !== "storage-usage") {
      return { idText: suffix, label: "image" };
    }
  }

  const brandMatch = pathname.match(/^\/api\/brand\/profiles\/([^/]+)(?:\/(activate|logo))?$/);
  if (brandMatch) {
    const action = brandMatch[2];
    const isMutation =
      (method === "PUT" && action === undefined)
      || (method === "DELETE" && (action === undefined || action === "logo"))
      || (method === "POST" && (action === "activate" || action === "logo"));
    if (isMutation) {
      return { idText: brandMatch[1] ?? "", label: "profile" };
    }
  }

  if (method === "GET") {
    const displayOpsMatch = pathname.match(/^\/api\/display-ops\/assets\/([^/]+)\/references$/);
    if (displayOpsMatch) {
      return { idText: displayOpsMatch[1] ?? "", label: "image" };
    }
  }

  return null;
}

function validateOptionalString(
  body: RecordLike,
  key: string,
  options: { allowNull?: boolean; nonEmpty?: boolean } = {}
): string | null {
  const value = body[key];
  if (value === undefined) return null;
  if (value === null && options.allowNull) return null;
  if (typeof value !== "string") return `${key} must be a string`;
  if (options.nonEmpty && value.trim().length === 0) return `${key} must be a non-empty string`;
  return null;
}

function validateCircuitRawBody(body: unknown, mode: "create" | "update"): string | null {
  if (!isRecord(body)) return "Circuit body must be an object";

  if (mode === "create") {
    if (typeof body.nameZh !== "string" || body.nameZh.trim().length === 0) {
      return "nameZh is required";
    }
  } else if (body.nameZh !== undefined) {
    if (typeof body.nameZh !== "string" || body.nameZh.trim().length === 0) {
      return "nameZh must be a non-empty string";
    }
  }

  const pageKeyError = validateOptionalString(body, "pageKey", { nonEmpty: true });
  if (pageKeyError) return pageKeyError;

  for (const key of ["nameEn", "icon", "unit", "mqttTopic"] as const) {
    const error = validateOptionalString(body, key, { allowNull: true });
    if (error) return error;
  }

  if (
    body.displaySlot !== undefined
    && body.displaySlot !== null
    && (typeof body.displaySlot !== "string" || !CIRCUIT_SLOT_SET.has(body.displaySlot))
  ) {
    return "displaySlot is not supported";
  }

  const numericKeys = [
    "ratedCapacity",
    "normalMin",
    "normalMax",
    "attentionMin",
    "attentionMax",
    "warningMin",
    "warningMax"
  ] as const;
  for (const key of numericKeys) {
    if (body[key] !== undefined && !isFiniteNumber(body[key])) {
      return `${key} must be a finite number`;
    }
  }
  if (isFiniteNumber(body.ratedCapacity) && body.ratedCapacity < 0) {
    return "ratedCapacity must be non-negative";
  }

  if (
    body.displayOrder !== undefined
    && (typeof body.displayOrder !== "number"
      || !Number.isSafeInteger(body.displayOrder)
      || body.displayOrder < 0)
  ) {
    return "displayOrder must be a non-negative safe integer";
  }

  if (body.enabled !== undefined && typeof body.enabled !== "boolean") {
    return "enabled must be a boolean";
  }

  return null;
}

function coalescePatch(raw: RecordLike, key: string, existing: unknown) {
  const value = raw[key];
  return value === undefined || value === null ? existing : value;
}

function buildCircuitCandidate(body: RecordLike, existing?: CircuitRow) {
  if (!existing) {
    const rc = body.ratedCapacity ?? 0;
    const ratedCapacity = typeof rc === "number" ? rc : 0;
    return {
      pageKey: body.pageKey ?? "factory-circuit",
      nameZh: body.nameZh,
      nameEn: body.nameEn ?? null,
      icon: body.icon ?? null,
      unit: body.unit ?? "kW",
      mqttTopic: body.mqttTopic ?? null,
      displaySlot: body.displaySlot ?? null,
      ratedCapacity: rc,
      normalMin: body.normalMin ?? 0,
      normalMax: body.normalMax ?? ratedCapacity * 0.7,
      attentionMin: body.attentionMin ?? ratedCapacity * 0.7,
      attentionMax: body.attentionMax ?? ratedCapacity * 0.9,
      warningMin: body.warningMin ?? ratedCapacity * 0.9,
      warningMax: body.warningMax ?? ratedCapacity,
      displayOrder: body.displayOrder ?? 0,
      enabled: body.enabled ?? true
    };
  }

  return {
    pageKey: coalescePatch(body, "pageKey", existing.page_key),
    nameZh: coalescePatch(body, "nameZh", existing.name_zh),
    nameEn: coalescePatch(body, "nameEn", existing.name_en),
    icon: coalescePatch(body, "icon", existing.icon),
    unit: coalescePatch(body, "unit", existing.unit),
    mqttTopic: coalescePatch(body, "mqttTopic", existing.mqtt_topic),
    displaySlot: body.displaySlot === undefined ? existing.display_slot : body.displaySlot,
    ratedCapacity: coalescePatch(body, "ratedCapacity", existing.rated_capacity),
    normalMin: coalescePatch(body, "normalMin", existing.normal_min),
    normalMax: coalescePatch(body, "normalMax", existing.normal_max),
    attentionMin: coalescePatch(body, "attentionMin", existing.attention_min),
    attentionMax: coalescePatch(body, "attentionMax", existing.attention_max),
    warningMin: coalescePatch(body, "warningMin", existing.warning_min),
    warningMax: coalescePatch(body, "warningMax", existing.warning_max),
    displayOrder: coalescePatch(body, "displayOrder", existing.display_order),
    enabled: body.enabled === undefined ? existing.enabled === 1 : body.enabled
  };
}

function validateCircuitCandidate(candidate: ReturnType<typeof buildCircuitCandidate>): string | null {
  if (typeof candidate.nameZh !== "string" || candidate.nameZh.trim().length === 0) {
    return "nameZh is required";
  }
  if (typeof candidate.pageKey !== "string" || candidate.pageKey.trim().length === 0) {
    return "pageKey must be a non-empty string";
  }
  if (
    candidate.displaySlot !== null
    && (typeof candidate.displaySlot !== "string" || !CIRCUIT_SLOT_SET.has(candidate.displaySlot))
  ) {
    return "displaySlot is not supported";
  }
  if (!isFiniteNumber(candidate.ratedCapacity) || candidate.ratedCapacity < 0) {
    return "ratedCapacity must be a finite non-negative number";
  }

  const thresholds = [
    candidate.normalMin,
    candidate.normalMax,
    candidate.attentionMin,
    candidate.attentionMax,
    candidate.warningMin,
    candidate.warningMax
  ];
  if (!thresholds.every(isFiniteNumber)) {
    return "Circuit thresholds must be finite numbers";
  }
  for (let index = 1; index < thresholds.length; index += 1) {
    if ((thresholds[index - 1] as number) > (thresholds[index] as number)) {
      return "Circuit thresholds must be ordered from normalMin through warningMax";
    }
  }
  if (
    typeof candidate.displayOrder !== "number"
    || !Number.isSafeInteger(candidate.displayOrder)
    || candidate.displayOrder < 0
  ) {
    return "displayOrder must be a non-negative safe integer";
  }
  if (typeof candidate.enabled !== "boolean") {
    return "enabled must be a boolean";
  }
  return null;
}

function validateImageUpdateBody(body: unknown): string | null {
  if (!isRecord(body)) return "Image update body must be an object";

  for (const key of ["title", "description"] as const) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return `${key} must be a string or null`;
    }
  }
  if (
    body.aspectRatio !== undefined
    && (!isFiniteNumber(body.aspectRatio) || body.aspectRatio <= 0)
  ) {
    return "aspectRatio must be a finite positive number";
  }
  if (
    body.displayDuration !== undefined
    && (typeof body.displayDuration !== "number"
      || !Number.isSafeInteger(body.displayDuration)
      || body.displayDuration < 1)
  ) {
    return "displayDuration must be a positive safe integer";
  }
  for (const key of ["includedInSlideshow", "isCover"] as const) {
    if (body[key] !== undefined && typeof body[key] !== "boolean") {
      return `${key} must be a boolean`;
    }
  }
  if (
    body.category !== undefined
    && (typeof body.category !== "string" || !MANAGED_ASSET_CATEGORY_SET.has(body.category))
  ) {
    return "category is not supported";
  }
  if (
    body.usageScope !== undefined
    && (typeof body.usageScope !== "string" || !MANAGED_ASSET_USAGE_SCOPE_SET.has(body.usageScope))
  ) {
    return "usageScope is not supported";
  }
  return null;
}

function validateReorderBody(body: unknown, key: "circuits" | "images"):
  | { error: string; items?: never }
  | { error?: never; items: Array<{ id: number; displayOrder: number }> } {
  if (!isRecord(body) || !Array.isArray(body[key])) {
    return { error: `${key} must be an array` };
  }

  const seen = new Set<number>();
  const items: Array<{ id: number; displayOrder: number }> = [];
  for (const [index, item] of body[key].entries()) {
    if (!isRecord(item)) return { error: `${key}[${index}] must be an object` };
    const id = item.id;
    const displayOrder = item.displayOrder;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
      return { error: `${key}[${index}].id must be a positive safe integer` };
    }
    if (
      typeof displayOrder !== "number"
      || !Number.isSafeInteger(displayOrder)
      || displayOrder < 0
    ) {
      return { error: `${key}[${index}].displayOrder must be a non-negative safe integer` };
    }
    if (seen.has(id)) return { error: `${key} contains duplicate id ${id}` };
    seen.add(id);
    items.push({ id, displayOrder });
  }
  return { items };
}

function findMissingIds(table: "circuit_configs" | "image_assets", ids: number[]): number[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(", ");
  const rows = getDatabase()
    .prepare(`SELECT id FROM ${table} WHERE id IN (${placeholders})`)
    .all(...ids) as Array<{ id: number }>;
  const found = new Set(rows.map((row) => row.id));
  return ids.filter((id) => !found.has(id));
}

function readCircuit(id: number): CircuitRow | undefined {
  return getDatabase()
    .prepare("SELECT * FROM circuit_configs WHERE id = ?")
    .get(id) as CircuitRow | undefined;
}

function imageExists(id: number): boolean {
  return Boolean(getDatabase().prepare("SELECT 1 FROM image_assets WHERE id = ?").get(id));
}

export async function managementInputValidationPlugin(app: FastifyInstance) {
  app.addHook("preValidation", async (request, reply) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const method = request.method.toUpperCase();

    const pathId = matchPathId(request);
    if (pathId) {
      const id = parsePositiveIntegerPathId(pathId.idText);
      if (id === null) {
        return sendBadRequest(reply, `Invalid ${pathId.label} ID`);
      }

      if (method === "PUT" && /^\/api\/circuits\/[^/]+$/.test(pathname)) {
        const existing = readCircuit(id);
        if (!existing) return sendNotFound(reply, "Circuit not found");
        const rawBody = request.body;
        const rawError = validateCircuitRawBody(rawBody, "update");
        if (rawError) return sendBadRequest(reply, rawError);
        const candidateError = validateCircuitCandidate(buildCircuitCandidate(rawBody as RecordLike, existing));
        if (candidateError) return sendBadRequest(reply, candidateError);
      }

      if (method === "GET" && pathname.startsWith("/api/display-ops/assets/") && !imageExists(id)) {
        return sendNotFound(reply, "Image not found");
      }
    }

    if (method === "POST" && pathname === "/api/circuits") {
      const rawError = validateCircuitRawBody(request.body, "create");
      if (rawError) return sendBadRequest(reply, rawError);
      const candidateError = validateCircuitCandidate(buildCircuitCandidate(request.body as RecordLike));
      if (candidateError) return sendBadRequest(reply, candidateError);
    }

    if (method === "PUT" && /^\/api\/images\/[^/]+$/.test(pathname) && pathname !== "/api/images/reorder") {
      const error = validateImageUpdateBody(request.body ?? {});
      if (error) return sendBadRequest(reply, error);
    }

    if (MUTATION_METHODS.has(method) && (pathname === "/api/circuits/reorder" || pathname === "/api/images/reorder")) {
      const key = pathname.includes("circuits") ? "circuits" : "images";
      const validation = validateReorderBody(request.body, key);
      if (validation.error) return sendBadRequest(reply, validation.error);
      const table = key === "circuits" ? "circuit_configs" : "image_assets";
      const missing = findMissingIds(table, validation.items.map((item) => item.id));
      if (missing.length > 0) return sendBadRequest(reply, `Unknown ${key.slice(0, -1)} id: ${missing[0]}`);
    }
  });
}
