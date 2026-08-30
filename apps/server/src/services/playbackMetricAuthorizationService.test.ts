import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "playback-metric-authorization-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [
  { closeDatabaseConnection },
  { migrateDatabase },
  { seedDatabase },
  { writeStageConfig },
  { readDefaultPlaybackProfileId },
  { readPlaybackMetricAuthorizationPlan },
  { saveDerivedMetricDefinition }
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./displayPagePublishingService.js"),
  import("./playbackProfileService.js"),
  import("./playbackMetricAuthorizationService.js"),
  import("./derivedMetricRegistryService.js")
]);

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
  migrateDatabase();
  seedDatabase();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("authorizes only foreign metrics referenced by the active playback profile", () => {
  writeStageConfig("overview", "live", {
    dataBindings: {
      power: {
        dataBinding: {
          metricKey: "realTimePower",
          scope: "kn",
          sourceType: "metric"
        },
        itemId: "power"
      }
    }
  });

  const plan = readPlaybackMetricAuthorizationPlan({
    clientId: "display-1",
    contextRevision: "revision-cl-1",
    deviceId: 1,
    groupId: 10,
    profileId: readDefaultPlaybackProfileId(),
    siteScope: "cl"
  });

  assert.deepEqual(plan.foreignSiteIdentities, [
    { metricKey: "realTimePower", metricScope: "kn" }
  ]);
  assert.equal(
    plan.identities.some(
      ({ metricKey, metricScope }) =>
        metricKey === "unrelatedKnMetric" && metricScope === "kn"
    ),
    false
  );
});

test("skips a disabled published custom binding without dropping valid authorizations", () => {
  const definition = saveDerivedMetricDefinition({
    description: "Disabled authorization test",
    enabled: true,
    expression: "source * 2",
    fallbackPolicy: "unavailable",
    inputs: [{
      alias: "source",
      kind: "metric",
      metricKey: "realTimePower",
      scope: "output-site",
      unit: "kW"
    }],
    managed: false,
    metricKey: "custom.disabledAuthorization",
    name: "Disabled Authorization",
    outputScopePolicy: "site",
    outputUnit: "kW",
    precision: 1,
    revision: 0
  });
  writeStageConfig("overview", "live", {
    dataBindings: {
      power: {
        dataBinding: {
          metricKey: "realTimePower",
          scope: "kn",
          sourceType: "metric"
        },
        itemId: "power"
      },
      today: {
        dataBinding: {
          metricKey: definition.metricKey,
          scope: "inherit-device",
          sourceType: "metric"
        },
        itemId: "today"
      }
    }
  });
  saveDerivedMetricDefinition({ ...definition, enabled: false });

  const plan = readPlaybackMetricAuthorizationPlan({
    clientId: "display-1",
    contextRevision: "revision-cl-1",
    deviceId: 1,
    groupId: 10,
    profileId: readDefaultPlaybackProfileId(),
    siteScope: "cl"
  });

  assert.deepEqual(plan.foreignSiteIdentities, [
    { metricKey: "realTimePower", metricScope: "kn" }
  ]);
  assert.equal(
    plan.identities.some(({ metricKey }) => metricKey === definition.metricKey),
    false
  );
});
