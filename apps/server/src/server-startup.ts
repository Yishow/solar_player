import { pathToFileURL } from "node:url";
import { config } from "./config.js";
import { buildApp } from "./app.js";
import { migrateDatabase } from "./db/migrate.js";
import { seedDatabase } from "./db/seed.js";
import { DailySummaryService } from "./services/DailySummaryService.js";
import { MetricsAccumulatorService } from "./services/MetricsAccumulatorService.js";
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
  createMetricsAccumulatorService?: (options: {
    emitDisplaySync: AppLike["socketService"]["emitDisplaySync"];
  }) => MetricsAccumulatorLifecycleService;
  createSnapshotWriterService?: (options: {
    emitDisplaySync: AppLike["socketService"]["emitDisplaySync"];
    metricsAccumulatorService: MetricsAccumulatorService;
  }) => LifecycleService;
  host?: string;
  migrateDatabase?: typeof migrateDatabase;
  port?: number;
  seedDatabase?: typeof seedDatabase;
};

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

  let app: AppLike | null = null;

  try {
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

    app.addHook("onClose", async () => {
      dailySummaryService.stop();
      snapshotWriterService.stop();
      metricsAccumulatorService.stop();
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
