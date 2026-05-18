import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import {
  createPlaybackRuntime,
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

const [{ buildApp }, { closeDatabaseConnection }, { migrateDatabase }, { seedDatabase }] = await Promise.all([
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
      "data-not-ready"
    );
    assert.equal(body.preview.fallbackRoute, null);
  } finally {
    await app.close();
  }
});

test("GET /api/display-pages/rotation-preview reports out-of-schedule pages with a machine-readable reason", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    await app.inject({
      method: "PUT",
      url: "/api/playback/settings",
      payload: {
        repeatDays: [3],
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
