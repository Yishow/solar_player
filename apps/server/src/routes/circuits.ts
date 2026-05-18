import type { FastifyPluginAsync } from "fastify";
import type { CircuitConfig } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { readDisplayReadinessReport } from "../services/displayReadinessService.js";

type CircuitRow = {
  id: number;
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

function toBoolean(value: unknown): boolean {
  return value === true || value === 1;
}

function serializeCircuit(row: CircuitRow): CircuitConfig {
  return {
    id: row.id,
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

function getAllCircuits(): CircuitConfig[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM circuit_configs ORDER BY display_order ASC, id ASC`
    )
    .all() as CircuitRow[];
  return rows.map(serializeCircuit);
}

type CircuitCreateBody = {
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

const circuitsRoute: FastifyPluginAsync = async (app) => {
  // GET /api/circuits
  app.get("/api/circuits", async () => ({
    success: true,
    data: getAllCircuits(),
    readiness: readDisplayReadinessReport()
  }));

  // POST /api/circuits
  app.post<{ Body: CircuitCreateBody }>("/api/circuits", async (request) => {
    const db = getDatabase();
    const body = request.body;

    const rc = body.ratedCapacity ?? 0;
    const result = db
      .prepare(
        `INSERT INTO circuit_configs (
          name_zh, name_en, icon, unit, mqtt_topic, display_slot, rated_capacity,
          normal_min, normal_max, attention_min, attention_max, warning_min, warning_max,
          display_order, enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        body.nameZh ?? null,
        body.nameEn ?? null,
        body.icon ?? null,
        body.unit ?? "kW",
        body.mqttTopic ?? null,
        body.displaySlot ?? null,
        rc,
        body.normalMin ?? 0,
        body.normalMax ?? rc * 0.7,
        body.attentionMin ?? rc * 0.7,
        body.attentionMax ?? rc * 0.9,
        body.warningMin ?? rc * 0.9,
        body.warningMax ?? rc,
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

  // PUT /api/circuits/:id
  app.put<{ Params: { id: string }; Body: CircuitUpdateBody }>(
    "/api/circuits/:id",
    async (request) => {
      const db = getDatabase();
      const id = Number.parseInt(request.params.id, 10);
      const body = request.body;

      const existing = db
        .prepare("SELECT * FROM circuit_configs WHERE id = ?")
        .get(id) as CircuitRow | undefined;

      if (!existing) {
        return { success: false, error: "Circuit not found" };
      }

      const rc = body.ratedCapacity ?? existing.rated_capacity;
      db.prepare(
        `UPDATE circuit_configs SET
          name_zh = COALESCE(?, name_zh),
          name_en = COALESCE(?, name_en),
          icon = COALESCE(?, icon),
          unit = COALESCE(?, unit),
          mqtt_topic = COALESCE(?, mqtt_topic),
          display_slot = ?,
          rated_capacity = ?,
          normal_min = COALESCE(?, normal_min),
          normal_max = COALESCE(?, normal_max),
          attention_min = COALESCE(?, attention_min),
          attention_max = COALESCE(?, attention_max),
          warning_min = COALESCE(?, warning_min),
          warning_max = COALESCE(?, warning_max),
          display_order = COALESCE(?, display_order),
          enabled = COALESCE(?, enabled),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
      ).run(
        body.nameZh ?? null,
        body.nameEn ?? null,
        body.icon ?? null,
        body.unit ?? null,
        body.mqttTopic ?? null,
        body.displaySlot === undefined ? existing.display_slot : body.displaySlot,
        rc,
        body.normalMin,
        body.normalMax,
        body.attentionMin,
        body.attentionMax,
        body.warningMin,
        body.warningMax,
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

  // DELETE /api/circuits/:id
  app.delete<{ Params: { id: string } }>("/api/circuits/:id", async (request, reply) => {
    const db = getDatabase();
    const id = Number.parseInt(request.params.id, 10);

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

  // PUT /api/circuits/reorder
  app.put<{ Body: ReorderBody }>("/api/circuits/reorder", async (request) => {
    const db = getDatabase();
    const body = request.body;

    const updateStmt = db.prepare(
      "UPDATE circuit_configs SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    );

    const transaction = db.transaction((items: ReorderItem[]) => {
      for (const item of items) {
        updateStmt.run(item.displayOrder, item.id);
      }
    });

    transaction(body.circuits ?? []);

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
