import { pathToFileURL } from "node:url";
import { config } from "./config.js";
import { buildApp } from "./app.js";
import { getDatabase } from "./db/index.js";
import { migrateDatabase } from "./db/migrate.js";
import { seedDatabase } from "./db/seed.js";
import { type MqttSettingsRow, resolveMqttSettings } from "./mqtt/settings-source.js";
import { acquireServerRuntimeGuard } from "./serverRuntimeGuard.js";
import { DailySummaryService } from "./services/DailySummaryService.js";
import { MetricHistoryRetentionService } from "./services/MetricHistoryRetentionService.js";
import { MetricsAccumulatorService } from "./services/MetricsAccumulatorService.js";
import { MockMetricsFeedService } from "./services/MockMetricsFeedService.js";
import { SnapshotWriterService } from "./services/SnapshotWriterService.js";

type LifecycleService = {
  start: () => void;
  stop: () => void;
};

type MetricsAccumulatorLifecycleService = LifecycleService & {
  initialize: () => void;
};

type AppLike = Awaited<ReturnType<typeof buildApp>>;

type StartServerOptions = {
  buildApp?: typeof buildApp;
  createDailySummaryService?: (options: {
    emitDisplaySync: AppLike["socketService"]["emitDisplaySync"];
    metricsAccumulatorService: MetricsAccumulatorService;
  }) => LifecycleService;
  createMetricHistoryRetentionService?: (options: {
    logger: AppLike["log"];
    snapshotRetentionDays: number;
    summaryRetentionDays: number;
    vacuumEnabled: boolean;
  }) => LifecycleService;
  createMetricsAccumulatorService?: (options: {
    emitDisplaySync: AppLike["socketService"]["emitDisplaySync"];
  }) => MetricsAccumulatorLifecycleService;
  createMockMetricsFeedService?: () => LifecycleService;
  acquireServerRuntimeGuard?: (options: { dataDir: string }) => () => void;
  createSnapshotWriterService?: (options: {
    emitDisplaySync: AppLike["socketService"]["emitDisplaySync"];
    metricsAccumulatorService: MetricsAccumulatorService;
  }) => LifecycleService;
  host?: string;
  migrateDatabase?: typeof migrateDatabase;
  port?: number;
  resolveDataMode?: () => "mqtt" | "mock";
  seedDatabase?: typeof seedDatabase;
};

function readStoredDataMode(): "mqtt" | "mock" {
  const row = getDatabase()
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
        LIMIT 1
      `
    )
    .get() as MqttSettingsRow | undefined;

  return resolveMqttSettings(process.env, row).data_mode === "mock" ? "mock" : "mqtt";
}

export async function startServer(options: StartServerOptions = {}) {
  const buildAppImpl = options.buildApp ?? buildApp;
  const createMetricsAccumulatorService =
    options.createMetricsAccumulatorService ??
    ((serviceOptions) => new MetricsAccumulatorService(serviceOptions));
  const createSnapshotWriterService =
    options.createSnapshotWriterService ??
    ((serviceOptions) => new SnapshotWriterService(serviceOptions));
  const createDailySummaryService =
    options.createDailySummaryService ??
    ((serviceOptions) => new DailySummaryService(serviceOptions));
  const createMetricHistoryRetentionService =
    options.createMetricHistoryRetentionService ??
    ((serviceOptions) => new MetricHistoryRetentionService(serviceOptions));
  const createMockMetricsFeedService =
    options.createMockMetricsFeedService ?? (() => new MockMetricsFeedService());
  const resolveDataMode = options.resolveDataMode ?? readStoredDataMode;
  const acquireRuntimeGuard =
    options.acquireServerRuntimeGuard ??
    ((guardOptions) => acquireServerRuntimeGuard(guardOptions));

  let app: AppLike | null = null;
  let releaseRuntimeGuard: (() => void) | null = null;

  try {
    releaseRuntimeGuard = acquireRuntimeGuard({
      dataDir: config.dataDir
    });
    (options.migrateDatabase ?? migrateDatabase)();
    (options.seedDatabase ?? seedDatabase)();

    app = await buildAppImpl();

    const emitDisplaySync = app.socketService.emitDisplaySync.bind(app.socketService);
    const metricsAccumulatorService = createMetricsAccumulatorService({
      emitDisplaySync
    });

    metricsAccumulatorService.initialize();
    metricsAccumulatorService.start();

    const snapshotWriterService = createSnapshotWriterService({
      emitDisplaySync,
      metricsAccumulatorService: metricsAccumulatorService as MetricsAccumulatorService
    });
    snapshotWriterService.start();

    const dailySummaryService = createDailySummaryService({
      emitDisplaySync,
      metricsAccumulatorService: metricsAccumulatorService as MetricsAccumulatorService
    });
    dailySummaryService.start();

    const metricHistoryRetentionService = createMetricHistoryRetentionService({
      logger: app.log,
      snapshotRetentionDays: config.metricSnapshotRetentionDays,
      summaryRetentionDays: config.dailySummaryRetentionDays,
      vacuumEnabled: config.metricRetentionVacuumEnabled
    });
    metricHistoryRetentionService.start();

    let mockMetricsFeedService: LifecycleService | null = null;
    if (resolveDataMode() === "mock") {
      mockMetricsFeedService = createMockMetricsFeedService();
      mockMetricsFeedService.start();
    }

    app.addHook("onClose", async () => {
      mockMetricsFeedService?.stop();
      metricHistoryRetentionService.stop();
      dailySummaryService.stop();
      snapshotWriterService.stop();
      metricsAccumulatorService.stop();
      releaseRuntimeGuard?.();
      releaseRuntimeGuard = null;
    });

    await app.listen({
      host: options.host ?? config.host,
      port: options.port ?? config.port
    });

    void app.mqttClientService.connect().catch((error) => {
      app?.log.warn({ error }, "MQTT initial connect failed");
    });
  } catch (error) {
    if (app) {
      app.log.error(error);
      await app.close();
    } else {
      releaseRuntimeGuard?.();
      releaseRuntimeGuard = null;
      console.error(error);
    }

    process.exit(1);
  }
}

export function isExecutedAsMainModule(moduleUrl: string) {
  const entryPath = process.argv[1];

  if (!entryPath) {
    return false;
  }

  return pathToFileURL(entryPath).href === moduleUrl;
}
