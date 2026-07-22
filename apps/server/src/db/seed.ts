import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_PLAYBACK_TRANSITION_SPEED_MS } from "@solar-display/shared";
import {
  getEnvMqttSettings,
  hasExplicitMqttEnvSettings,
  type MqttSettingsRow,
  shouldBootstrapStoredMqttSettings
} from "../mqtt/settings-source.js";
import { SOLAR_GENERATION_PROFILE_KW } from "../metrics/solarGenerationProfile.js";
import { bootstrapDisplaySeedAssets } from "../services/displaySeedAssetBootstrapService.js";
import { closeDatabaseConnection, getDatabase } from "./index.js";
import { normalizeMetricSnapshotCapturedAt } from "./normalizeMetricSnapshotCapturedAt.js";

const topicMappings = [
  { metricKey: "realTimePower", topic: "kuozui/plant/solar/power", unit: "kW" },
  { metricKey: "selfConsumptionEnergy", topic: "kuozui/plant/solar/self_consumption", unit: "kWh" },
  { metricKey: "consumptionEnergy", topic: "kuozui/plant/factory/consumption", unit: "kWh" },
  { metricKey: "systemEfficiency", topic: "kuozui/plant/solar/efficiency", unit: "%" },
  { metricKey: "factoryPeakMultiplier", topic: "factory/peak_multiplier", unit: "x" },
  { metricKey: "factoryStampingPower", topic: "factory/power/stamping", unit: "kW" },
  { metricKey: "factoryBodyPower", topic: "factory/power/body", unit: "kW" },
  { metricKey: "factoryPaintingPower", topic: "factory/power/painting", unit: "kW" },
  { metricKey: "factoryAssemblyPower", topic: "factory/power/assembly", unit: "kW" },
  { metricKey: "factoryUtilityPower", topic: "factory/power/utility", unit: "kW" },
  { metricKey: "factoryOfficePower", topic: "factory/power/office", unit: "kW" },
  { metricKey: "factoryHeavyVehiclePower", topic: "factory/power/heavy_vehicle", unit: "kW" },
  { metricKey: "factoryEdCoatingPower", topic: "factory/power/ed_coating", unit: "kW" },
  { metricKey: "factoryCircuit.guanyin.stampingPower", topic: "factory/guanyin/power/stamping", unit: "kW" },
  { metricKey: "factoryCircuit.guanyin.bodyPower", topic: "factory/guanyin/power/body", unit: "kW" },
  { metricKey: "factoryCircuit.guanyin.paintingPower", topic: "factory/guanyin/power/painting", unit: "kW" },
  { metricKey: "factoryCircuit.guanyin.assemblyPower", topic: "factory/guanyin/power/assembly", unit: "kW" },
  { metricKey: "factoryCircuit.guanyin.utilityPower", topic: "factory/guanyin/power/utility", unit: "kW" },
  { metricKey: "factoryCircuit.guanyin.officePower", topic: "factory/guanyin/power/office", unit: "kW" },
  { metricKey: "factoryCircuit.guanyin.heavyVehiclePower", topic: "factory/guanyin/power/heavy_vehicle", unit: "kW" },
  { metricKey: "factoryCircuit.guanyin.edCoatingPower", topic: "factory/guanyin/power/ed_coating", unit: "kW" }
] as const;

const circuitConfigs = [
  {
    pageKey: "factory-circuit",
    displaySlot: "stamping",
    nameZh: "沖壓工程",
    nameEn: "Stamping Shop",
    icon: "factory",
    mqttTopic: "factory/power/stamping",
    ratedCapacity: 850
  },
  {
    pageKey: "factory-circuit",
    displaySlot: "body",
    nameZh: "車身工程",
    nameEn: "Body Shop",
    icon: "wind",
    mqttTopic: "factory/power/body",
    ratedCapacity: 620
  },
  {
    pageKey: "factory-circuit",
    displaySlot: "painting",
    nameZh: "塗裝工程",
    nameEn: "Painting Shop",
    icon: "lightbulb",
    mqttTopic: "factory/power/painting",
    ratedCapacity: 180
  },
  {
    pageKey: "factory-circuit",
    displaySlot: "assembly",
    nameZh: "裝配工程",
    nameEn: "Assembly Shop",
    icon: "building-2",
    mqttTopic: "factory/power/assembly",
    ratedCapacity: 240
  },
  {
    pageKey: "factory-circuit",
    displaySlot: "utility",
    nameZh: "原動力",
    nameEn: "Utility & Powerhouse",
    icon: "battery-charging",
    mqttTopic: "factory/power/utility",
    ratedCapacity: 320
  },
  {
    pageKey: "factory-circuit",
    displaySlot: "office",
    nameZh: "事務系",
    nameEn: "Office & Administration",
    icon: "settings-2",
    mqttTopic: "factory/power/office",
    ratedCapacity: 200
  },
  {
    pageKey: "factory-circuit-guanyin",
    displaySlot: "stamping",
    nameZh: "觀音沖壓工程",
    nameEn: "Guanyin Stamping Shop",
    icon: "factory",
    mqttTopic: "factory/guanyin/power/stamping",
    ratedCapacity: 850
  },
  {
    pageKey: "factory-circuit-guanyin",
    displaySlot: "body",
    nameZh: "觀音車身工程",
    nameEn: "Guanyin Body Shop",
    icon: "wind",
    mqttTopic: "factory/guanyin/power/body",
    ratedCapacity: 620
  },
  {
    pageKey: "factory-circuit-guanyin",
    displaySlot: "painting",
    nameZh: "觀音塗裝工程",
    nameEn: "Guanyin Painting Shop",
    icon: "lightbulb",
    mqttTopic: "factory/guanyin/power/painting",
    ratedCapacity: 180
  },
  {
    pageKey: "factory-circuit-guanyin",
    displaySlot: "assembly",
    nameZh: "觀音裝配工程",
    nameEn: "Guanyin Assembly Shop",
    icon: "building-2",
    mqttTopic: "factory/guanyin/power/assembly",
    ratedCapacity: 240
  },
  {
    pageKey: "factory-circuit-guanyin",
    displaySlot: "utility",
    nameZh: "觀音原動力",
    nameEn: "Guanyin Utility & Powerhouse",
    icon: "battery-charging",
    mqttTopic: "factory/guanyin/power/utility",
    ratedCapacity: 320
  },
  {
    pageKey: "factory-circuit-guanyin",
    displaySlot: "office",
    nameZh: "觀音事務系",
    nameEn: "Guanyin Office & Administration",
    icon: "settings-2",
    mqttTopic: "factory/guanyin/power/office",
    ratedCapacity: 200
  },
  {
    pageKey: "factory-circuit-guanyin",
    displaySlot: "heavy_vehicle",
    nameZh: "觀音大車工程",
    nameEn: "Guanyin Heavy Vehicle Line",
    icon: "car",
    mqttTopic: "factory/guanyin/power/heavy_vehicle",
    ratedCapacity: 400
  },
  {
    pageKey: "factory-circuit-guanyin",
    displaySlot: "ed_coating",
    nameZh: "觀音ED電著",
    nameEn: "Guanyin ED Coating Line",
    icon: "refresh",
    mqttTopic: "factory/guanyin/power/ed_coating",
    ratedCapacity: 300
  }
] as const;

const playbackPages = [
  { pageKey: "overview", route: "/overview", labelZh: "總覽", labelEn: "Overview", displayOrder: 1 },
  { pageKey: "solar", route: "/solar", labelZh: "太陽能", labelEn: "Solar", displayOrder: 2 },
  {
    pageKey: "factory-circuit",
    route: "/factory-circuit",
    labelZh: "中壢廠區用電迴路",
    labelEn: "Factory Circuit (Jungli)",
    displayOrder: 3
  },
  {
    pageKey: "factory-circuit-guanyin",
    templateKey: "factory-circuit",
    route: "/factory-circuit-guanyin",
    labelZh: "觀音廠區用電迴路",
    labelEn: "Factory Circuit (Guanyin)",
    displayOrder: 4
  },
  { pageKey: "images", route: "/images", labelZh: "綠能影像", labelEn: "Images", displayOrder: 5 },
  {
    pageKey: "sustainability",
    route: "/sustainability",
    labelZh: "永續成果",
    labelEn: "Sustainability",
    displayOrder: 6
  }
] as const;

// Intraday solar generation *power* (kW) seeded into metric_snapshots.generation_power
// so the Overview trend renders a realistic daily solar profile from runtime data
// rather than mock content inside the widget. Shape comes from the shared
// SOLAR_GENERATION_PROFILE_KW (steep morning ramp, early-afternoon peak, gentle
// evening decline) so the seed history and the dev mock feed stay aligned.
export function buildIntradayGenerationCurve(): number[] {
  return [...SOLAR_GENERATION_PROFILE_KW];
}

export function seedDatabase() {
  const database = getDatabase();
  normalizeMetricSnapshotCapturedAt(database);
  const hasSeededIntradaySnapshots =
    database
      .prepare("SELECT 1 FROM system_settings WHERE key = 'intraday_snapshots_seeded' LIMIT 1")
      .get() !== undefined;
  const insertSetting = database.prepare(`
    INSERT INTO system_settings (key, value, updated_at)
    SELECT ?, ?, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM system_settings WHERE key = ?
    )
  `);

  const insertTopicMapping = database.prepare(`
    INSERT INTO topic_mappings (
      metric_key,
      topic,
      unit,
      value_path,
      multiplier,
      offset,
      decimal_places,
      enabled,
      created_at,
      updated_at
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM topic_mappings WHERE metric_key = ?
    )
  `);

  const insertCircuitConfig = database.prepare(`
    INSERT INTO circuit_configs (
      page_key,
      name_zh,
      name_en,
      icon,
      unit,
      mqtt_topic,
      display_slot,
      rated_capacity,
      normal_min,
      normal_max,
      attention_min,
      attention_max,
      warning_min,
      warning_max,
      display_order,
      enabled,
      created_at,
      updated_at
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM circuit_configs WHERE page_key = ? AND display_slot = ?
    )
  `);

  const insertPlaybackPage = database.prepare(`
    INSERT INTO playback_pages (
      page_key,
      route,
      label_zh,
      label_en,
      enabled,
      display_order,
      duration_seconds
    )
    SELECT ?, ?, ?, ?, 1, ?, 15
    WHERE NOT EXISTS (
      SELECT 1 FROM playback_pages WHERE page_key = ?
    )
  `);

  const insertCalculationSettings = database.prepare(`
    INSERT INTO calculation_settings (
      id,
      carbon_emission_factor,
      tree_equivalent_factor,
      co2_auto_convert_small_to_kg,
      household_daily_usage_kwh,
      household_monthly_usage_kwh,
      estimated_tariff_per_kwh,
      created_at,
      updated_at
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM calculation_settings WHERE id = ?
    )
  `);

  const insertDisplayPageRegistryInstance = database.prepare(`
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
    )
    SELECT ?, ?, ?, ?, ?, 1, NULL, ?, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM display_page_registry WHERE page_key = ?
    )
  `);
  database.transaction(() => {
    insertSetting.run("co2_factor", "0.494", "co2_factor");
    insertSetting.run("data_mode", "mqtt", "data_mode");
    insertCalculationSettings.run(1, 0.467, 0.16, 0, 13, 400, 4.5, 1);

    const existingMqttSettings = database
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

    if (!existingMqttSettings || (hasExplicitMqttEnvSettings(process.env) && shouldBootstrapStoredMqttSettings(existingMqttSettings))) {
      const mqttSettings = getEnvMqttSettings(process.env);
      database.prepare("DELETE FROM mqtt_settings").run();
      database
        .prepare(`
          INSERT INTO mqtt_settings (
            broker_host,
            broker_port,
            username,
            password,
            client_id,
            reconnect_interval,
            message_timeout,
            data_mode
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          mqttSettings.broker_host,
          mqttSettings.broker_port,
          mqttSettings.username,
          mqttSettings.password,
          mqttSettings.client_id,
          mqttSettings.reconnect_interval,
          mqttSettings.message_timeout,
          mqttSettings.data_mode
        );
    }

    for (const topicMapping of topicMappings) {
      insertTopicMapping.run(
        topicMapping.metricKey,
        topicMapping.topic,
        topicMapping.unit,
        "$.value",
        1,
        0,
        topicMapping.unit === "%" ? 1 : 2,
        1,
        topicMapping.metricKey
      );
    }

    circuitConfigs.forEach((circuitConfig, index) => {
      insertCircuitConfig.run(
        circuitConfig.pageKey,
        circuitConfig.nameZh,
        circuitConfig.nameEn,
        circuitConfig.icon,
        "kW",
        circuitConfig.mqttTopic,
        circuitConfig.displaySlot,
        circuitConfig.ratedCapacity,
        0,
        circuitConfig.ratedCapacity * 0.7,
        circuitConfig.ratedCapacity * 0.7,
        circuitConfig.ratedCapacity * 0.9,
        circuitConfig.ratedCapacity * 0.9,
        circuitConfig.ratedCapacity,
        index + 1,
        1,
        circuitConfig.pageKey,
        circuitConfig.displaySlot
      );
    });

    for (const page of playbackPages) {
      insertPlaybackPage.run(
        page.pageKey,
        page.route,
        page.labelZh,
        page.labelEn,
        page.displayOrder,
        page.pageKey
      );

      insertDisplayPageRegistryInstance.run(
        page.pageKey,
        (page as any).templateKey ?? page.pageKey,
        page.route.replace(/^\//, ""),
        page.labelZh,
        page.labelEn,
        page.displayOrder,
        page.pageKey
      );
    }

    const guanyinConfigJson = JSON.stringify({
      loadRowStates: {
        stamping: { visible: true },
        body: { visible: true },
        painting: { visible: true },
        assembly: { visible: true },
        utility: { visible: true },
        office: { visible: true },
        heavy_vehicle: { visible: true },
        ed_coating: { visible: true }
      },
      loadRows: {
        stamping: { height: 65, left: 1392, top: 146, width: 470 },
        body: { height: 65, left: 1392, top: 220, width: 470 },
        painting: { height: 65, left: 1392, top: 294, width: 470 },
        assembly: { height: 65, left: 1392, top: 368, width: 470 },
        utility: { height: 65, left: 1392, top: 442, width: 470 },
        office: { height: 65, left: 1392, top: 516, width: 470 },
        heavy_vehicle: { height: 65, left: 1392, top: 590, width: 470 },
        ed_coating: { height: 65, left: 1392, top: 664, width: 470 }
      }
    });

    database.prepare(`
      INSERT OR IGNORE INTO display_page_configs (page_key, config_json, updated_at)
      VALUES ('factory-circuit-guanyin', ?, CURRENT_TIMESTAMP)
    `).run(guanyinConfigJson);

    database.prepare(`
      INSERT OR IGNORE INTO display_page_stage_configs (page_key, stage, config_json, version, updated_at, published_at, published_by)
      VALUES ('factory-circuit-guanyin', 'draft', ?, 1, CURRENT_TIMESTAMP, NULL, NULL)
    `).run(guanyinConfigJson);

    database.prepare(`
      INSERT OR IGNORE INTO display_page_stage_configs (page_key, stage, config_json, version, updated_at, published_at, published_by)
      VALUES ('factory-circuit-guanyin', 'live', ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system')
    `).run(guanyinConfigJson);

    database.prepare(`
      INSERT INTO playback_settings (
        id,
        autoplay,
        loop,
        start_page,
        transition_type,
        transition_speed,
        schedule_enabled,
        schedule_start,
        schedule_end,
        repeat_days,
        idle_mode,
        idle_timeout,
        brightness,
        orientation,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO NOTHING
    `).run(
      1,
      1,
      1,
      0,
      "fade",
      DEFAULT_PLAYBACK_TRANSITION_SPEED_MS,
      0,
      "08:00",
      "18:00",
      "1,2,3,4,5",
      0,
      300,
      100,
      "landscape"
    );

    const snapshotCount = (
      database.prepare("SELECT COUNT(*) AS count FROM metric_snapshots").get() as { count: number }
    ).count;

    if (snapshotCount === 0 && !hasSeededIntradaySnapshots) {
      const insertSnapshot = database.prepare(
        "INSERT INTO metric_snapshots (generation_power, captured_at) VALUES (?, ?)"
      );
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);

      buildIntradayGenerationCurve().forEach((generationPower, hour) => {
        const capturedAt = new Date(dayStart.getTime() + hour * 60 * 60 * 1000);
        insertSnapshot.run(generationPower, capturedAt.toISOString());
      });
      database
        .prepare(
          "INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES ('intraday_snapshots_seeded', '1', CURRENT_TIMESTAMP)"
        )
        .run();
    }
  })();

  bootstrapDisplaySeedAssets();
}

async function runFromCli() {
  try {
    seedDatabase();
  } finally {
    closeDatabaseConnection();
  }
}

const entryFile = process.argv[1];

if (entryFile && import.meta.url === pathToFileURL(resolve(entryFile)).href) {
  void runFromCli();
}
