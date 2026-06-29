import type { FastifyPluginAsync } from "fastify";
import { readdirSync, statSync } from "node:fs";
import { config } from "../config.js";
import { getDatabase } from "../db/index.js";
import { type MqttSettingsRow, resolveMqttSettings } from "../mqtt/settings-source.js";

type SectionStatus = "ready" | "degraded" | "unavailable";
type SecretStatus = "configured" | "missing";

type DirectorySummary = {
  status: SectionStatus;
  dir: string;
  fileCount: number;
  totalBytes: number;
};

type DataSourceOverview = {
  generatedAt: string;
  runtimeStorage: {
    status: "ready";
    dataDir: string;
    databasePath: string;
    uploadsDir: string;
    brandUploadsDir: string;
  };
  sqlite: {
    status: SectionStatus;
    databasePath: string;
    tableCounts: Record<string, number>;
  };
  uploads: {
    status: SectionStatus;
    imageUploads: DirectorySummary;
    brandUploads: DirectorySummary;
  };
  mqtt: {
    status: "ready";
    dataMode: "mqtt" | "mock";
    host: string;
    port: number;
    username: SecretStatus;
    password: SecretStatus;
  };
  monitoring: {
    anomalyMessages: string[];
    hasCurrentDaySnapshots: boolean;
    latestSnapshotAt: string | null;
    latestSnapshotDate: string | null;
    localDate: string;
  };
  weather: {
    status: "ready";
    cwaAuthorization: SecretStatus;
    openDataUrl: string;
    requestTimeoutMs: number;
  };
  retention: {
    status: "ready";
    metricSnapshotRetentionDays: number;
    dailySummaryRetentionDays: number;
    vacuumEnabled: boolean;
  };
  browserLocalCache: {
    status: "browser-managed";
    description: string;
  };
  relatedRoutes: Array<{
    label: string;
    path: string;
    category: "mqtt" | "uploads" | "playback" | "device";
  }>;
  recommendations: Array<{
    title: string;
    status: "recommended";
    description: string;
  }>;
  warnings: string[];
};

type BuildDataSourceOverviewDeps = {
  now?: () => Date;
  readTableCounts?: () => Record<string, number>;
  summarizeDirectory?: (dir: string) => Omit<DirectorySummary, "dir">;
};

function toSecretStatus(value: string | null | undefined): SecretStatus {
  return value && value.trim().length > 0 ? "configured" : "missing";
}

function readMqttSettingsRow() {
  try {
    return getDatabase()
      .prepare(
        `
          SELECT
            broker_host,
            broker_port,
            username,
            password,
            client_id,
            reconnect_interval,
            message_timeout,
            data_mode
          FROM mqtt_settings
          ORDER BY rowid ASC
          LIMIT 1
        `
      )
      .get() as MqttSettingsRow | undefined;
  } catch {
    return undefined;
  }
}

function readTableCounts(): Record<string, number> {
  const database = getDatabase();
  const tables = database
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name ASC
      `
    )
    .all() as Array<{ name: string }>;

  return Object.fromEntries(
    tables.map(({ name }) => {
      // Identifiers cannot be parameterized; escape embedded double quotes so a table
      // name containing `"` cannot break out of the quoted identifier.
      const quotedName = name.replace(/"/g, '""');
      const row = database.prepare(`SELECT COUNT(*) AS count FROM "${quotedName}"`).get() as { count: number };
      return [name, row.count];
    })
  );
}

function summarizeDirectory(dir: string): Omit<DirectorySummary, "dir"> {
  let fileCount = 0;
  let totalBytes = 0;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    fileCount += 1;
    totalBytes += statSync(`${dir}/${entry.name}`).size;
  }

  return {
    fileCount,
    status: "ready",
    totalBytes
  };
}

function unavailableDirectorySummary(dir: string): DirectorySummary {
  return {
    dir,
    fileCount: 0,
    status: "unavailable",
    totalBytes: 0
  };
}

function combineUploadStatus(imageStatus: SectionStatus, brandStatus: SectionStatus): SectionStatus {
  if (imageStatus === "ready" && brandStatus === "ready") {
    return "ready";
  }

  if (imageStatus === "unavailable" && brandStatus === "unavailable") {
    return "unavailable";
  }

  return "degraded";
}

type MonitoringSnapshotDiagnosticRow = {
  captured_at: string;
  generation: number | null;
  generation_power: number | null;
};

function parseCapturedAt(capturedAt: string) {
  return new Date(capturedAt.replace(" ", "T"));
}

function toLocalDateKey(date: Date) {
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toLocalTimeLabel(date: Date) {
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function readMonitoringDiagnostics(now: Date) {
  const rows = getDatabase()
    .prepare(
      `
        SELECT captured_at, generation, generation_power
        FROM metric_snapshots
        WHERE generation IS NOT NULL OR generation_power IS NOT NULL
        ORDER BY captured_at DESC
        LIMIT 2000
      `
    )
    .all() as MonitoringSnapshotDiagnosticRow[];

  const localDate = toLocalDateKey(now);
  const parsedRows = rows.flatMap((row) => {
    const parsedAt = parseCapturedAt(row.captured_at);
    return Number.isNaN(parsedAt.getTime())
      ? []
      : [{ capturedAt: row.captured_at, date: parsedAt, generationPower: row.generation_power }];
  });

  const latestRow = parsedRows.reduce<typeof parsedRows[number] | null>((latest, row) => {
    if (!latest || row.date.getTime() > latest.date.getTime()) {
      return row;
    }

    return latest;
  }, null);
  const latestSnapshotDate = latestRow ? toLocalDateKey(latestRow.date) : null;
  const hasCurrentDaySnapshots = parsedRows.some((row) => toLocalDateKey(row.date) === localDate);
  const anomalyMessages: string[] = [];

  if (!hasCurrentDaySnapshots && latestSnapshotDate) {
    anomalyMessages.push(`尚無今日 snapshot，最新資料停留在 ${latestSnapshotDate}。`);
  }

  const suspiciousRow = parsedRows.find((row) => {
    if (typeof row.generationPower !== "number" || row.generationPower <= 100) {
      return false;
    }

    const hour = row.date.getHours();
    return hour < 4 || hour >= 20;
  });

  if (suspiciousRow) {
    const generationPower = suspiciousRow.generationPower;
    anomalyMessages.push(
      `偵測到 ${toLocalTimeLabel(suspiciousRow.date)} 夜間高發電 snapshot（約 ${Math.round(generationPower ?? 0)} kW），請檢查系統時間。`
    );
  }

  return {
    anomalyMessages,
    hasCurrentDaySnapshots,
    latestSnapshotAt: latestRow?.capturedAt ?? null,
    latestSnapshotDate,
    localDate
  };
}

function deleteTodayTrendSnapshots(now: Date) {
  const localDate = toLocalDateKey(now);
  const rows = getDatabase()
    .prepare("SELECT id, captured_at FROM metric_snapshots")
    .all() as Array<{ captured_at: string; id: number }>;
  const rowIds = rows.flatMap((row) => {
    const parsedAt = parseCapturedAt(row.captured_at);
    if (Number.isNaN(parsedAt.getTime()) || toLocalDateKey(parsedAt) !== localDate) {
      return [];
    }

    return [row.id];
  });

  const deleteStatement = getDatabase().prepare("DELETE FROM metric_snapshots WHERE id = ?");
  const runDelete = getDatabase().transaction((ids: number[]) => {
    for (const rowId of ids) {
      deleteStatement.run(rowId);
    }
  });
  runDelete(rowIds);

  return {
    deletedSnapshots: rowIds.length,
    resetDate: localDate
  };
}

export function buildDataSourceOverview(deps: BuildDataSourceOverviewDeps = {}): DataSourceOverview {
  const now = deps.now?.() ?? new Date();
  const warnings: string[] = [];
  const tableCountsReader = deps.readTableCounts ?? readTableCounts;
  const directorySummarizer = deps.summarizeDirectory ?? summarizeDirectory;
  let tableCounts: Record<string, number> = {};
  let sqliteStatus: SectionStatus = "ready";

  try {
    tableCounts = tableCountsReader();
  } catch (error) {
    sqliteStatus = "unavailable";
    warnings.push(`SQLite table count summary unavailable: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  const summarizeUploadDir = (label: string, dir: string): DirectorySummary => {
    try {
      return {
        dir,
        ...directorySummarizer(dir)
      };
    } catch (error) {
      warnings.push(`${label} upload summary unavailable: ${error instanceof Error ? error.message : "unknown error"}`);
      return unavailableDirectorySummary(dir);
    }
  };

  const imageUploads = summarizeUploadDir("uploads/images", config.uploadsDir);
  const brandUploads = summarizeUploadDir("uploads/brand", config.brandUploadsDir);
  const mqttSettings = resolveMqttSettings(process.env, readMqttSettingsRow());
  const monitoring = readMonitoringDiagnostics(now);

  return {
    browserLocalCache: {
      description: "Browser-local cache is used only for UI recovery and first-paint hints; server SQLite remains the source of truth.",
      status: "browser-managed"
    },
    generatedAt: new Date().toISOString(),
    mqtt: {
      dataMode: mqttSettings.data_mode === "mock" ? "mock" : "mqtt",
      host: mqttSettings.broker_host ?? "localhost",
      password: toSecretStatus(mqttSettings.password),
      port: mqttSettings.broker_port ?? 1883,
      status: "ready",
      username: toSecretStatus(mqttSettings.username)
    },
    monitoring,
    recommendations: [
      {
        description: "Package SQLite, uploads, and runtime settings into an operator-downloadable archive.",
        status: "recommended",
        title: "Runtime state export"
      },
      {
        description: "Add a guided SQLite backup and restore flow after kiosk read-only behavior is stable.",
        status: "recommended",
        title: "Database backup and restore"
      },
      {
        description: "Expose a single health check that verifies SQLite, uploads, MQTT, weather, and display sync freshness.",
        status: "recommended",
        title: "Data source health check"
      },
      {
        description: "Evaluate PostgreSQL/MySQL or remote database connectors in a separate proposal with credential handling and migration safety.",
        status: "recommended",
        title: "External database connector evaluation"
      }
    ],
    relatedRoutes: [
      { category: "mqtt", label: "MQTT 設定", path: "/settings/mqtt" },
      { category: "uploads", label: "圖片管理", path: "/settings/images" },
      { category: "playback", label: "播放設定", path: "/settings/playback" },
      { category: "device", label: "裝置狀態", path: "/device-status" }
    ],
    retention: {
      dailySummaryRetentionDays: config.dailySummaryRetentionDays,
      metricSnapshotRetentionDays: config.metricSnapshotRetentionDays,
      status: "ready",
      vacuumEnabled: config.metricRetentionVacuumEnabled
    },
    runtimeStorage: {
      brandUploadsDir: config.brandUploadsDir,
      dataDir: config.dataDir,
      databasePath: config.databasePath,
      status: "ready",
      uploadsDir: config.uploadsDir
    },
    sqlite: {
      databasePath: config.databasePath,
      status: sqliteStatus,
      tableCounts
    },
    uploads: {
      brandUploads,
      imageUploads,
      status: combineUploadStatus(imageUploads.status, brandUploads.status)
    },
    warnings,
    weather: {
      cwaAuthorization: toSecretStatus(config.cwaAuthorization),
      openDataUrl: config.cwaOpenDataUrl,
      requestTimeoutMs: config.weatherRequestTimeoutMs,
      status: "ready"
    }
  };
}

const dataSourceRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/data-source/overview", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    return buildDataSourceOverview();
  });

  app.post("/api/data-source/reset-today-trend", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    const result = deleteTodayTrendSnapshots(new Date());
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "today-trend-reset",
      scope: "monitoring-history"
    });

    reply.send({
      data: {
        deletedSnapshots: result.deletedSnapshots,
        resetAt: new Date().toISOString(),
        resetDate: result.resetDate
      },
      success: true
    });
  });
};

export default dataSourceRoute;
