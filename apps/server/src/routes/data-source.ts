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
      const row = database.prepare(`SELECT COUNT(*) AS count FROM "${name}"`).get() as { count: number };
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

export function buildDataSourceOverview(deps: BuildDataSourceOverviewDeps = {}): DataSourceOverview {
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
};

export default dataSourceRoute;
