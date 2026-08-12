import type { FastifyPluginAsync } from "fastify";
import type { CircuitConfig } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { readDisplayReadinessReport } from "../services/displayReadinessService.js";

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

type CircuitThresholdCandidate = {
  ratedCapacity: number;
  normalMin: number;
  normalMax: number;
  attentionMin: number;
  attentionMax: number;
  warningMin: number;
  warningMax: number;
};

type CircuitCreateBody = {
  pageKey?: string;
  nameZh: string;
  nameEn?: string;
  icon?: string;
  unit?: string;
  mqttTopic?: string;
  ratedCapacity?: number;
  normalMin?: number;
  normalMax?: number;
  attentionMin?: number;
  attentionMax?: number;
  warningMin?: number;
  warningMax?: number;
  displayOrder?: number;
  displaySlot?: string | null;
  enabled?: boolean;
};

type CircuitUpdateBody = Partial<CircuitCreateBody>;
type ReorderItem = { id: number; displayOrder: number };
type ReorderBody = { circuits: ReorderItem[] };

const thresholdFields = [
  "ratedCapacity",
  "normalMin",
  "normalMax",
  "attentionMin",
  "attentionMax",
  "warningMin",
  "warningMax"
] as const;

const optionalStringFields = ["pageKey", "nameEn", "icon", "unit", "mqttTopic"] as const;

function toBoolean(value: unknown): boolean {
  return value === true || value === 1;
}

function serializeCircuit(row: CircuitRow): CircuitConfig {
  return {
    id: row.id,
    pageKey: row.page_key,
    nameZh: row.name_zh,
    nameEn: row.name_en,
    icon: row.icon,
    unit: row.unit,
    mqttTopic: row.mqtt_topic,
    ratedCapacity: row.rated_capacity,
    normalMin: row.normal_min,
    normalMax: row.normal_max,
    attentionMin: row.attention_min,
    attentionMax: row.attention_max,
    warningMin: row.warning_min,
    warningMax: row.warning_max,
    displayOrder: row.display_order,
    displaySlot: row.display_slot,
    enabled: toBoolean(row.enabled)
  };
}

function getAllCircuits(pageKey?: string): CircuitConfig[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `
        SELECT * FROM circuit_configs
        WHERE (? IS NULL OR page_key = ?)
        ORDER BY display_order ASC, id ASC
      `
    )
    .all(pageKey ?? null, pageKey ?? null) as CircuitRow[];
  return rows.map(serializeCircuit);
}

function parseCircuitId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validateThresholdCandidate(candidate: CircuitThresholdCandidate) {
  const values = Object.values(candidate);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    return "Circuit capacity and thresholds must be finite non-negative numbers";
  }

  if (
    candidate.normalMin > candidate.normalMax
    || candidate.normalMax > candidate.attentionMin
    || candidate.attentionMin > candidate.attentionMax
    || candidate.attentionMax > candidate.warningMin
    || candidate.warningMin > candidate.warningMax
    || candidate.warningMax > candidate.ratedCapacity
  ) {
    return "Circuit thresholds must be ordered within rated capacity";
  }

  return null;
}

function validateCircuitBody(body: unknown, options: { requireName: boolean }) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return "Circuit body must be an object";
  }

  const input = body as Record<string, unknown>;
  if (options.requireName || input.nameZh !== undefined) {
    if (typeof input.nameZh !== "string" || input.nameZh.trim().length === 0) {
      return "nameZh must be a non-empty string";
    }
  }

  for (const field of optionalStringFields) {
    if (input[field] !== undefined && typeof input[field] !== "string") {
      return `${field} must be a string`;
    }
  }

  if (
    input.displaySlot !== undefined
    && input.displaySlot !== null
    && typeof input.displaySlot !== "string"
  ) {
    return "displaySlot must be a string or null";
  }

  if (input.enabled !== undefined && typeof input.enabled !== "boolean") {
    return "enabled must be a boolean";
  }

  if (
    input.displayOrder !== undefined
    && (!Number.isInteger(input.displayOrder) || (input.displayOrder as number) < 0)
  ) {
    return "displayOrder must be a non-negative integer";
  }

  for (const field of thresholdFields) {
    const value = input[field];
    if (
      value !== undefined
      && (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    ) {
      return `${field} must be a finite non-negative number`;
    }
  }

  return null;
}

function createThresholdCandidate(body: CircuitCreateBody): CircuitThresholdCandidate {
  const ratedCapacity = body.ratedCapacity ?? 0;
  return {
    ratedCapacity,
    normalMin: body.normalMin ?? 0,
    normalMax: body.normalMax ?? ratedCapacity * 0.7,
    attentionMin: body.attentionMin ?? ratedCapacity * 0.7,
    attentionMax: body.attentionMax ?? ratedCapacity * 0.9,
    warningMin: body.warningMin ?? ratedCapacity * 0.9,
    warningMax: body.warningMax ?? ratedCapacity
  };
}

function updateThresholdCandidate(
  existing: CircuitRow,
  body: CircuitUpdateBody
): CircuitThresholdCandidate {
  const ratedCapacity = body.ratedCapacity ?? existing.rated_capacity ?? 0;
  return {
    ratedCapacity,
    normalMin: body.normalMin ?? existing.normal_min ?? 0,
    normalMax: body.normalMax ?? existing.normal_max ?? ratedCapacity * 0.7,
    attentionMin: body.attentionMin ?? existing.attention_min ?? ratedCapacity * 0.7,
    attentionMax: body.attentionMax ?? existing.attention_max ?? ratedCapacity * 0.9,
    warningMin: body.warningMin ?? existing.warning_min ?? ratedCapacity * 0.9,
    warningMax: body.warningMax ?? existing.warning_max ?? ratedCapacity
  };
}

function validateReorderBody(body: unknown): body is ReorderBody {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return false;
  }

  const circuits = (body as { circuits?: unknown }).circuits;
  if (!Array.isArray(circuits)) {
    return false;
  }

  return circuits.every((item) => (
    item !== null
    && typeof item === "object"
    && Number.isInteger((item as { id?: unknown }).id)
    && ((item as { id: number }).id > 0)
    && Number.isInteger((item as { displayOrder?: unknown }).displayOrder)
    && ((item as { displayOrder: number }).displayOrder >= 0)
  ));
}

const circuitsRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { pageKey?: string } }>("/api/circuits", async (request) => ({
    success: true,
    data: getAllCircuits(request.query.pageKey?.trim() || undefined),
    readiness: readDisplayReadinessReport()
  }));

  app.post<{ Body: CircuitCreateBody }>("/api/circuits", async (request, reply) => {
    const bodyValidationError = validateCircuitBody(request.body, { requireName: true });
    if (bodyValidationError) {
      return reply.status(400).send({ success: false, error: bodyValidationError });
    }

    const body = request.body;
    const thresholds = createThresholdCandidate(body);
    const thresholdValidationError = validateThresholdCandidate(thresholds);
    if (thresholdValidationError) {
      return reply.status(400).send({ success: false, error: thresholdValidationError });
    }

    const db = getDatabase();
    const result = db
      .prepare(
        `INSERT INTO circuit_configs (
          page_key, name_zh, name_en, icon, unit, mqtt_topic, display_slot, rated_capacity,
          normal_min, normal_max, attention_min, attention_max, warning_min, warning_max,
          display_order, enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        body.pageKey?.trim() || "factory-circuit",
        body.nameZh.trim(),
        body.nameEn ?? null,
        body.icon ?? null,
        body.unit ?? "kW",
        body.mqttTopic ?? null,
        body.displaySlot ?? null,
        thresholds.ratedCapacity,
        thresholds.normalMin,
        thresholds.normalMax,
        thresholds.attentionMin,
        thresholds.attentionMax,
        thresholds.warningMin,
        thresholds.warningMax,
        body.displayOrder ?? 0,
        body.enabled === false ? 0 : 1
      );

    const inserted = db
      .prepare("SELECT * FROM circuit_configs WHERE id = ?")
      .get(result.lastInsertRowid) as CircuitRow | undefined;

    app.socketService.emitCircuitSettingsUpdated({
      action: "created",
      circuit: inserted ? serializeCircuit(inserted) : null
    });
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "circuit-created",
      scope: "circuits"
    });

    return {
      success: true,
      data: inserted ? serializeCircuit(inserted) : null,
      readiness: readDisplayReadinessReport()
    };
  });

  app.put<{ Params: { id: string }; Body: CircuitUpdateBody }>(
    "/api/circuits/:id",
    async (request, reply) => {
      const id = parseCircuitId(request.params.id);
      if (id === null) {
        return reply.status(400).send({ success: false, error: "Invalid circuit ID" });
      }

      const bodyValidationError = validateCircuitBody(request.body, { requireName: false });
      if (bodyValidationError) {
        return reply.status(400).send({ success: false, error: bodyValidationError });
      }

      const db = getDatabase();
      const body = request.body;
      const existing = db
        .prepare("SELECT * FROM circuit_configs WHERE id = ?")
        .get(id) as CircuitRow | undefined;

      if (!existing) {
        return reply.status(404).send({ success: false, error: "Circuit not found" });
      }

      const thresholds = updateThresholdCandidate(existing, body);
      const thresholdValidationError = validateThresholdCandidate(thresholds);
      if (thresholdValidationError) {
        return reply.status(400).send({ success: false, error: thresholdValidationError });
      }

      db.prepare(
        `UPDATE circuit_configs SET
          name_zh = COALESCE(?, name_zh),
          page_key = COALESCE(?, page_key),
          name_en = COALESCE(?, name_en),
          icon = COALESCE(?, icon),
          unit = COALESCE(?, unit),
          mqtt_topic = COALESCE(?, mqtt_topic),
          display_slot = ?,
          rated_capacity = ?,
          normal_min = ?,
          normal_max = ?,
          attention_min = ?,
          attention_max = ?,
          warning_min = ?,
          warning_max = ?,
          display_order = COALESCE(?, display_order),
          enabled = COALESCE(?, enabled),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
      ).run(
        body.nameZh?.trim() ?? null,
        body.pageKey?.trim() || null,
        body.nameEn ?? null,
        body.icon ?? null,
        body.unit ?? null,
        body.mqttTopic ?? null,
        body.displaySlot === undefined ? existing.display_slot : body.displaySlot,
        thresholds.ratedCapacity,
        thresholds.normalMin,
        thresholds.normalMax,
        thresholds.attentionMin,
        thresholds.attentionMax,
        thresholds.warningMin,
        thresholds.warningMax,
        body.displayOrder,
        body.enabled === undefined ? undefined : (body.enabled ? 1 : 0),
        id
      );

      const updated = db
        .prepare("SELECT * FROM circuit_configs WHERE id = ?")
        .get(id) as CircuitRow | undefined;

      app.socketService.emitCircuitSettingsUpdated({
        action: "updated",
        circuit: updated ? serializeCircuit(updated) : null
      });
      app.socketService.emitDisplaySync({
        generatedAt: new Date().toISOString(),
        reason: "circuit-updated",
        scope: "circuits"
      });

      return {
        success: true,
        data: updated ? serializeCircuit(updated) : null,
        readiness: readDisplayReadinessReport()
      };
    }
  );

  app.delete<{ Params: { id: string } }>("/api/circuits/:id", async (request, reply) => {
    const id = parseCircuitId(request.params.id);
    if (id === null) {
      return reply.status(400).send({ success: false, error: "Invalid circuit ID" });
    }

    const db = getDatabase();
    const existing = db
      .prepare("SELECT * FROM circuit_configs WHERE id = ?")
      .get(id) as CircuitRow | undefined;

    if (!existing) {
      reply.code(404);
      return { success: false, error: "Circuit not found" };
    }

    db.prepare("DELETE FROM circuit_configs WHERE id = ?").run(id);

    app.socketService.emitCircuitSettingsUpdated({
      action: "deleted",
      circuitId: id
    });
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "circuit-deleted",
      scope: "circuits"
    });

    return { success: true, data: { id }, readiness: readDisplayReadinessReport() };
  });

  app.put<{ Body: ReorderBody }>("/api/circuits/reorder", async (request, reply) => {
    if (!validateReorderBody(request.body)) {
      return reply.status(400).send({ success: false, error: "Invalid circuit reorder payload" });
    }

    const db = getDatabase();
    const updateStmt = db.prepare(
      "UPDATE circuit_configs SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    );

    const transaction = db.transaction((items: ReorderItem[]) => {
      for (const item of items) {
        updateStmt.run(item.displayOrder, item.id);
      }
    });

    transaction(request.body.circuits);

    app.socketService.emitCircuitSettingsUpdated({ action: "reordered" });
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "circuit-reordered",
      scope: "circuits"
    });

    return { success: true, data: getAllCircuits(), readiness: readDisplayReadinessReport() };
  });
};

export default circuitsRoute;
