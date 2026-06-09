import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import {
  createPlaybackRuntime,
  displayPageFallbackPolicyByTemplateKey,
  evaluateDisplayRotation,
  getEnabledPlaybackPages,
  getPlaybackPage,
  isPlaybackAllowedBySchedule,
  shouldEnterIdleMode,
  type DisplayRotationSkipReason,
  type PlaybackPage,
  type PlaybackSettings
} from "@solar-display/shared";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-playback-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ buildApp }, { closeDatabaseConnection, getDatabase }, { migrateDatabase }, { seedDatabase }] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
]);

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(process.env.DATABASE_PATH!, { force: true });
  rmSync(`${process.env.DATABASE_PATH!}-shm`, { force: true });
  rmSync(`${process.env.DATABASE_PATH!}-wal`, { force: true });
});

const baseSettings: PlaybackSettings = {
  autoplay: true,
  brightness: 100,
  idleMode: "disabled",
  idleTimeout: 300,
  loop: true,
  orientation: "landscape",
  repeatDays: [1, 2, 3, 4, 5],
  scheduleEnabled: false,
  scheduleEnd: "18:00",
  scheduleStart: "08:00",
  startPage: 2,
  transitionSpeed: 1000,
  transitionType: "fade",
  updatedAt: null
};

const basePages: PlaybackPage[] = [
  {
    displayOrder: 2,
    durationSeconds: 20,
    enabled: true,
    id: 2,
    labelEn: "Solar",
    labelZh: "太陽能",
    pageKey: "solar",
    route: "/solar"
  },
  {
    displayOrder: 1,
    durationSeconds: 10,
    enabled: true,
    id: 1,
    labelEn: "Overview",
    labelZh: "總覽",
    pageKey: "overview",
    route: "/overview"
  },
  {
    displayOrder: 3,
    durationSeconds: 15,
    enabled: false,
    id: 3,
    labelEn: "Images",
    labelZh: "圖庫",
    pageKey: "images",
    route: "/images"
  }
];

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

function seedMetricReading(
  metricKey = "realTimePower",
  timestamp = new Date().toISOString()
) {
  getDatabase()
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(metric_key) DO UPDATE SET
          value = excluded.value,
          unit = excluded.unit,
          timestamp = excluded.timestamp,
          quality = excluded.quality,
          raw_payload = excluded.raw_payload
      `
    )
    .run(metricKey, 586.2, "kW", timestamp, "good", '{"value":586.2}');
}

function seedFreshMetricReading(metricKey = "realTimePower") {
  seedMetricReading(metricKey);
}

test("playback shared helpers sort enabled pages, honor schedule, and enter idle mode", () => {
  const enabledPages = getEnabledPlaybackPages(basePages);
  assert.deepEqual(
    enabledPages.map((page) => page.id),
    [1, 2]
  );

  const runtime = createPlaybackRuntime(baseSettings, basePages, {
    nowMs: Date.UTC(2026, 4, 13, 1, 0, 0),
    route: "/solar"
  });

  assert.equal(runtime.currentIndex, 1);
  assert.equal(getPlaybackPage(runtime, basePages)?.route, "/solar");
  assert.equal(runtime.countdownMs, 20000);

  const scheduledSettings = {
    ...baseSettings,
    repeatDays: [3],
    scheduleEnabled: true
  } satisfies PlaybackSettings;

  assert.equal(
    isPlaybackAllowedBySchedule(scheduledSettings, new Date("2026-05-13T09:30:00+08:00")),
    true
  );
  assert.equal(
    isPlaybackAllowedBySchedule(scheduledSettings, new Date("2026-05-13T19:30:00+08:00")),
    false
  );

  const idleSettings = {
    ...baseSettings,
    idleMode: "return-to-start",
    idleTimeout: 30
  } satisfies PlaybackSettings;

  assert.equal(shouldEnterIdleMode(idleSettings, 10_000, 39_000), false);
  assert.equal(shouldEnterIdleMode(idleSettings, 10_000, 40_000), true);
});

test("display rotation evaluator skips disabled and not-ready pages while preserving playable order", () => {
  const preview = evaluateDisplayRotation({
    fallbackRoute: "/offline",
    now: new Date("2026-05-13T09:30:00+08:00"),
    pageConditions: {
      1: { isPublished: true, isHealthy: true, isReady: true },
      2: { isPublished: true, isHealthy: true, isReady: false },
      3: { isPublished: true, isHealthy: true, isReady: true }
    },
    pages: basePages,
    settings: baseSettings
  });

  assert.deepEqual(
    preview.playablePages.map((page) => page.id),
    [1]
  );
  assert.deepEqual(
    preview.skippedPages.map((page) => [page.id, page.skipReason] satisfies [number, DisplayRotationSkipReason]),
    [
      [2, "data-not-ready"],
      [3, "disabled"]
    ]
  );
  assert.equal(preview.fallbackRoute, null);
});

test("display rotation evaluator falls back when schedule blocks every enabled page", () => {
  const preview = evaluateDisplayRotation({
    fallbackRoute: "/offline",
    now: new Date("2026-05-13T19:30:00+08:00"),
    pages: basePages,
    settings: {
      ...baseSettings,
      scheduleEnabled: true
    }
  });

  assert.equal(preview.playablePages.length, 0);
  assert.equal(preview.fallbackRoute, "/offline");
  assert.equal(preview.skippedPages[0]?.skipReason, "out-of-schedule");
  assert.equal(preview.skippedPages[1]?.skipReason, "out-of-schedule");
  assert.equal(preview.skippedPages[2]?.skipReason, "disabled");
});

test("display rotation evaluator preserves unknown skip reason strings for diagnostics", () => {
  const preview = evaluateDisplayRotation({
    now: new Date("2026-05-13T09:30:00+08:00"),
    pageConditions: {
      1: { skipReason: "maintenance-window" }
    },
    pages: basePages,
    settings: baseSettings
  });

  assert.equal(
    preview.skippedPages.find((page) => page.id === 1)?.skipReason,
    "maintenance-window"
  );
});

test("display rotation evaluator reports unpublished and asset-unhealthy pages with machine-readable skip reasons", () => {
  const preview = evaluateDisplayRotation({
    now: new Date("2026-05-13T09:30:00+08:00"),
    pageConditions: {
      1: { isPublished: false },
      2: { isHealthy: false }
    },
    pages: basePages,
    settings: baseSettings
  });

  assert.deepEqual(
    preview.playablePages.map((page) => page.id),
    []
  );
  assert.equal(
    preview.skippedPages.find((page) => page.id === 1)?.skipReason,
    "unpublished"
  );
  assert.equal(
    preview.skippedPages.find((page) => page.id === 2)?.skipReason,
    "asset-unhealthy"
  );
  assert.equal(
    preview.skippedPages.find((page) => page.id === 3)?.skipReason,
    "disabled"
  );
});

test("GET /api/playback/settings and /api/playback/pages expose seeded playback data", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const [settingsResponse, pagesResponse] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/playback/settings"
      }),
      app.inject({
        method: "GET",
        url: "/api/playback/pages"
      })
    ]);

    assert.equal(settingsResponse.statusCode, 200);
    assert.equal(pagesResponse.statusCode, 200);

    const settingsBody = settingsResponse.json() as {
      settings: PlaybackSettings;
    };
    const pagesBody = pagesResponse.json() as {
      pages: PlaybackPage[];
    };

    assert.deepEqual(settingsBody.settings.repeatDays, [1, 2, 3, 4, 5]);
    assert.equal(settingsBody.settings.idleMode, "disabled");
    assert.deepEqual(
      pagesBody.pages.map((page) => page.displayOrder),
      [1, 2, 3, 4, 5]
    );
  } finally {
    await app.close();
  }
});

test("GET /api/playback/pages resolves duplicate display pages from the registry instead of the legacy static playback table", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database
    .prepare(
      `
        INSERT INTO display_page_registry (
          page_key,
          template_key,
          route_slug,
          label_zh,
          label_en,
          enabled,
          archived_at,
          display_order,
          duration_seconds,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .run("images-2", "images", "images-secondary", "綠能影像副本", "Images Secondary", 1, 6, 22);

  const app = await buildApp();

  try {
    const pagesResponse = await app.inject({
      method: "GET",
      url: "/api/playback/pages"
    });

    assert.equal(pagesResponse.statusCode, 200);

    const pages = (pagesResponse.json() as { pages: PlaybackPage[] }).pages;
    assert.deepEqual(
      pages.map((page) => ({
        pageKey: page.pageKey,
        route: page.route,
        templateKey: page.templateKey
      })),
      [
        { pageKey: "overview", route: "/overview", templateKey: "overview" },
        { pageKey: "solar", route: "/solar", templateKey: "solar" },
        { pageKey: "factory-circuit", route: "/factory-circuit", templateKey: "factory-circuit" },
        { pageKey: "images", route: "/images", templateKey: "images" },
        { pageKey: "sustainability", route: "/sustainability", templateKey: "sustainability" },
        { pageKey: "images-2", route: "/images-secondary", templateKey: "images" }
      ]
    );
  } finally {
    await app.close();
  }
});

test("GET /api/playback/rotation-plan exposes the persisted display rotation plan", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/playback/rotation-plan"
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      rotationPlan: {
        pages: PlaybackPage[];
      };
    };

    assert.deepEqual(
      body.rotationPlan.pages.map((page) => page.pageKey),
      ["overview", "solar", "factory-circuit", "images", "sustainability"]
    );
    assert.deepEqual(
      body.rotationPlan.pages.map((page) => page.durationSeconds),
      [15, 15, 15, 15, 15]
    );
  } finally {
    await app.close();
  }
});

test("PUT /api/playback/settings and /api/playback/pages persist updates and emit socket events", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();
  const emittedEvents: unknown[] = [];
  const originalEmit = app.socketService.emitPlaybackSettingsUpdated.bind(app.socketService);

  app.socketService.emitPlaybackSettingsUpdated = (payload: unknown) => {
    emittedEvents.push(payload);
    originalEmit(payload);
  };

  try {
    const pagesResponse = await app.inject({
      method: "GET",
      url: "/api/playback/pages"
    });
    const pages = (pagesResponse.json() as { pages: PlaybackPage[] }).pages;

    const settingsUpdateResponse = await app.inject({
      method: "PUT",
      url: "/api/playback/settings",
      payload: {
        autoplay: false,
        brightness: 88,
        idleMode: "return-to-start",
        idleTimeout: 90,
        loop: false,
        orientation: "portrait",
        repeatDays: [1, 3, 5],
        scheduleEnabled: true,
        scheduleEnd: "19:00",
        scheduleStart: "07:30",
        startPage: pages[1]?.id ?? pages[0]?.id ?? 0,
        transitionSpeed: 1500,
        transitionType: "slide"
      } satisfies Partial<PlaybackSettings>
    });

    assert.equal(settingsUpdateResponse.statusCode, 200);
    const updatedSettings = (settingsUpdateResponse.json() as { settings: PlaybackSettings }).settings;
    assert.equal(updatedSettings.autoplay, false);
    assert.equal(updatedSettings.idleMode, "return-to-start");
    assert.deepEqual(updatedSettings.repeatDays, [1, 3, 5]);
    assert.equal(updatedSettings.transitionType, "slide");

    const pagesUpdateResponse = await app.inject({
      method: "PUT",
      url: "/api/playback/pages",
      payload: {
        pages: pages
          .slice()
          .reverse()
          .map((page, index) => ({
            displayOrder: index + 1,
            durationSeconds: 12 + index,
            enabled: index !== 0,
            id: page.id
          }))
      }
    });

    assert.equal(pagesUpdateResponse.statusCode, 200);
    const updatedPages = (pagesUpdateResponse.json() as { pages: PlaybackPage[] }).pages;
    assert.equal(updatedPages[0]?.displayOrder, 1);
    assert.equal(updatedPages[0]?.durationSeconds, 12);
    assert.equal(updatedPages[0]?.enabled, false);
    assert.equal(emittedEvents.length, 2);
  } finally {
    app.socketService.emitPlaybackSettingsUpdated = originalEmit;
    await app.close();
  }
});

test("PUT /api/playback/settings can switch transition type back to fade", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const slideUpdateResponse = await app.inject({
      method: "PUT",
      url: "/api/playback/settings",
      payload: {
        transitionType: "slide"
      } satisfies Partial<PlaybackSettings>
    });

    assert.equal(slideUpdateResponse.statusCode, 200);
    assert.equal((slideUpdateResponse.json() as { settings: PlaybackSettings }).settings.transitionType, "slide");

    const fadeUpdateResponse = await app.inject({
      method: "PUT",
      url: "/api/playback/settings",
      payload: {
        transitionType: "fade"
      } satisfies Partial<PlaybackSettings>
    });

    assert.equal(fadeUpdateResponse.statusCode, 200);
    assert.equal((fadeUpdateResponse.json() as { settings: PlaybackSettings }).settings.transitionType, "fade");
  } finally {
    await app.close();
  }
});

test("PUT /api/playback/settings clamps transition speed to the minimum playable duration", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "PUT",
      url: "/api/playback/settings",
      payload: {
        transitionSpeed: 0,
        transitionType: "slide"
      } satisfies Partial<PlaybackSettings>
    });

    assert.equal(response.statusCode, 200);
    assert.equal((response.json() as { settings: PlaybackSettings }).settings.transitionSpeed, 120);
  } finally {
    await app.close();
  }
});

test("PUT /api/playback/rotation-plan persists page order, enabled state, and duration", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const initialResponse = await app.inject({
      method: "GET",
      url: "/api/playback/rotation-plan"
    });
    const initialPlan = (initialResponse.json() as {
      rotationPlan: {
        pages: PlaybackPage[];
      };
    }).rotationPlan;

    const response = await app.inject({
      method: "PUT",
      url: "/api/playback/rotation-plan",
      payload: {
        pages: initialPlan.pages
          .slice()
          .reverse()
          .map((page, index) => ({
            id: page.id,
            enabled: index < 3,
            displayOrder: index + 1,
            durationSeconds: 18 + index
          }))
      }
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      rotationPlan: {
        pages: PlaybackPage[];
      };
    };

    assert.deepEqual(
      body.rotationPlan.pages.map((page) => ({
        durationSeconds: page.durationSeconds,
        enabled: page.enabled,
        pageKey: page.pageKey
      })),
      [
        { pageKey: "sustainability", enabled: true, durationSeconds: 18 },
        { pageKey: "images", enabled: true, durationSeconds: 19 },
        { pageKey: "factory-circuit", enabled: true, durationSeconds: 20 },
        { pageKey: "solar", enabled: false, durationSeconds: 21 },
        { pageKey: "overview", enabled: false, durationSeconds: 22 }
      ]
    );
  } finally {
    await app.close();
  }
});

test("GET /api/display-pages/rotation-preview exposes runtime playable pages and skip reasons", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-pages/rotation-preview"
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      preview: {
        fallbackRoute: string | null;
        playablePages: PlaybackPage[];
        skippedPages: Array<PlaybackPage & { skipReason: DisplayRotationSkipReason }>;
      };
    };

    assert.deepEqual(
      body.preview.playablePages.map((page) => page.pageKey),
      ["images"]
    );
    assert.equal(
      body.preview.skippedPages.find((page) => page.pageKey === "overview")?.skipReason,
      "stale-runtime"
    );
    assert.equal(body.preview.fallbackRoute, null);
  } finally {
    await app.close();
  }
});

test("GET /api/display-pages/rotation-preview uses readiness findings as the dominant skip reason when MQTT mappings are missing", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database
    .prepare("DELETE FROM topic_mappings WHERE metric_key = ?")
    .run("systemEfficiency");
  seedFreshMetricReading();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-pages/rotation-preview"
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      preview: {
        playablePages: PlaybackPage[];
        skippedPages: Array<PlaybackPage & { detail?: string | null; skipReason: DisplayRotationSkipReason }>;
      };
    };

    assert.equal(
      body.preview.playablePages.some((page) => page.pageKey === "solar"),
      false
    );
    assert.equal(
      body.preview.skippedPages.find((page) => page.pageKey === "solar")?.skipReason,
      "mqtt-mapping-missing"
    );
    assert.match(
      body.preview.skippedPages.find((page) => page.pageKey === "solar")?.detail ?? "",
      /systemEfficiency/i
    );
  } finally {
    await app.close();
  }
});

test("GET /api/display-pages/rotation-preview keeps a previously-seen live-data page in rotation when one metric turns stale", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  const originalSolarStaleDataPolicy = displayPageFallbackPolicyByTemplateKey.solar.staleData;
  displayPageFallbackPolicyByTemplateKey.solar.staleData = "hide";
  database.prepare("DELETE FROM live_metric_values").run();
  database
    .prepare(
      `
        UPDATE display_page_registry
        SET enabled = CASE page_key
          WHEN 'overview' THEN 1
          WHEN 'solar' THEN 1
          WHEN 'images' THEN 0
          ELSE 0
        END
      `
    )
    .run();

  const freshTimestamp = new Date().toISOString();
  const staleTimestamp = new Date(Date.now() - 60_000).toISOString();
  for (const metricKey of [
    "realTimePower",
    "todayGeneration",
    "totalGeneration",
    "todayCo2Reduction",
    "totalCo2Reduction",
    "selfConsumptionRatio",
    "selfConsumptionEnergy",
    "consumptionEnergy"
  ]) {
    seedMetricReading(metricKey, freshTimestamp);
  }
  seedMetricReading("systemEfficiency", staleTimestamp);

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-pages/rotation-preview"
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      preview: {
        playablePages: PlaybackPage[];
        skippedPages: Array<PlaybackPage & { detail?: string | null; skipReason: DisplayRotationSkipReason }>;
      };
    };

    assert.equal(
      body.preview.playablePages.some((page) => page.pageKey === "overview"),
      true
    );
    assert.equal(
      body.preview.playablePages.some((page) => page.pageKey === "solar"),
      true
    );
    assert.equal(body.preview.skippedPages.find((page) => page.pageKey === "solar"), undefined);
  } finally {
    displayPageFallbackPolicyByTemplateKey.solar.staleData = originalSolarStaleDataPolicy;
    await app.close();
  }
});

test("GET /api/display-pages/rotation-preview still skips a live-data page that has never received its full metric set", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database
    .prepare(
      `
        UPDATE display_page_registry
        SET enabled = CASE page_key
          WHEN 'overview' THEN 1
          WHEN 'solar' THEN 1
          WHEN 'images' THEN 0
          ELSE 0
        END
      `
    )
    .run();

  const freshTimestamp = new Date().toISOString();
  for (const metricKey of [
    "realTimePower",
    "todayGeneration",
    "totalGeneration",
    "todayCo2Reduction",
    "totalCo2Reduction",
    "selfConsumptionRatio",
    "selfConsumptionEnergy",
    "consumptionEnergy"
  ]) {
    seedMetricReading(metricKey, freshTimestamp);
  }

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-pages/rotation-preview"
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      preview: {
        playablePages: PlaybackPage[];
        skippedPages: Array<PlaybackPage & { detail?: string | null; skipReason: DisplayRotationSkipReason }>;
      };
    };

    assert.equal(
      body.preview.playablePages.some((page) => page.pageKey === "overview"),
      true
    );
    assert.equal(
      body.preview.playablePages.some((page) => page.pageKey === "solar"),
      false
    );
    assert.equal(
      body.preview.skippedPages.find((page) => page.pageKey === "solar")?.skipReason,
      "stale-runtime"
    );
    assert.match(
      body.preview.skippedPages.find((page) => page.pageKey === "solar")?.detail ?? "",
      /完整即時資料/
    );
  } finally {
    await app.close();
  }
});

test("GET /api/display-pages/rotation-preview keeps slot conflicts blocking even in mock mode", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database
    .prepare(
      `
        UPDATE circuit_configs
        SET display_slot = 'production'
        WHERE id IN (
          SELECT id
          FROM circuit_configs
          WHERE enabled = 1
          ORDER BY id ASC
          LIMIT 2
        )
      `
    )
    .run();

  const app = await buildApp();

  try {
    const mqttResponse = await app.inject({
      method: "PUT",
      url: "/api/settings/mqtt",
      payload: {
        clientId: "solar-display-player",
        dataMode: "mock",
        host: "localhost",
        messageTimeout: 30,
        password: "",
        port: 1883,
        reconnectInterval: 5000,
        username: ""
      }
    });
    assert.equal(mqttResponse.statusCode, 200);

    const response = await app.inject({
      method: "GET",
      url: "/api/display-pages/rotation-preview"
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      preview: {
        playablePages: PlaybackPage[];
        skippedPages: Array<PlaybackPage & { detail?: string | null; skipReason: DisplayRotationSkipReason }>;
      };
    };

    assert.equal(
      body.preview.playablePages.some((page) => page.pageKey === "factory-circuit"),
      false
    );
    assert.equal(
      body.preview.skippedPages.find((page) => page.pageKey === "factory-circuit")?.skipReason,
      "slot-binding-conflict"
    );
    assert.match(
      body.preview.skippedPages.find((page) => page.pageKey === "factory-circuit")?.detail ?? "",
      /slot conflict/i
    );
  } finally {
    await app.close();
  }
});

test("GET /api/display-pages/rotation-preview reports out-of-schedule pages with a machine-readable reason", async () => {
  migrateDatabase();
  seedDatabase();
  const today = new Date().getDay();
  const offScheduleDay = (today + 1) % 7;

  const app = await buildApp();

  try {
    await app.inject({
      method: "PUT",
      url: "/api/playback/settings",
      payload: {
        repeatDays: [offScheduleDay],
        scheduleEnabled: true,
        scheduleEnd: "18:00",
        scheduleStart: "08:00"
      } satisfies Partial<PlaybackSettings>
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/display-pages/rotation-preview"
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      preview: {
        skippedPages: Array<PlaybackPage & { skipReason: DisplayRotationSkipReason }>;
      };
    };

    assert.equal(
      body.preview.skippedPages.find((page) => page.pageKey === "overview")?.skipReason,
      "out-of-schedule"
    );
    assert.equal(
      body.preview.skippedPages.find((page) => page.pageKey === "images")?.skipReason,
      "out-of-schedule"
    );
  } finally {
    await app.close();
  }
});
