import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  getEnvMqttSettings,
  hasExplicitMqttEnvSettings,
  type MqttSettingsRow,
  shouldBootstrapStoredMqttSettings
} from "../mqtt/settings-source.js";
import { closeDatabaseConnection, getDatabase } from "./index.js";

const topicMappings = [
  { metricKey: "realTimePower", topic: "kuozui/plant/solar/power", unit: "kW" },
  { metricKey: "todayGeneration", topic: "kuozui/plant/solar/today_energy", unit: "kWh" },
  { metricKey: "totalGeneration", topic: "kuozui/plant/solar/total_energy", unit: "kWh" },
  { metricKey: "todayCo2Reduction", topic: "kuozui/plant/solar/today_co2", unit: "t" },
  { metricKey: "totalCo2Reduction", topic: "kuozui/plant/solar/total_co2", unit: "t" },
  { metricKey: "selfConsumptionEnergy", topic: "kuozui/plant/solar/self_consumption", unit: "kWh" },
  { metricKey: "consumptionEnergy", topic: "kuozui/plant/factory/consumption", unit: "kWh" },
  { metricKey: "systemEfficiency", topic: "kuozui/plant/solar/efficiency", unit: "%" },
  { metricKey: "factoryProductionPower", topic: "factory/power/production", unit: "kW" },
  { metricKey: "factoryHvacPower", topic: "factory/power/hvac", unit: "kW" },
  { metricKey: "factoryLightingPower", topic: "factory/power/lighting", unit: "kW" },
  { metricKey: "factoryOfficePower", topic: "factory/power/office", unit: "kW" },
  { metricKey: "factoryEvGreenPower", topic: "factory/power/ev_green", unit: "kW" },
  { metricKey: "factoryInfrastructurePower", topic: "factory/power/infrastructure", unit: "kW" }
] as const;

const circuitConfigs = [
  {
    nameZh: "生產線用電",
    nameEn: "Production Line",
    icon: "factory",
    mqttTopic: "factory/power/production",
    ratedCapacity: 850
  },
  {
    nameZh: "空調與環境設備",
    nameEn: "HVAC & Environment",
    icon: "wind",
    mqttTopic: "factory/power/hvac",
    ratedCapacity: 620
  },
  {
    nameZh: "照明系統",
    nameEn: "Lighting",
    icon: "lightbulb",
    mqttTopic: "factory/power/lighting",
    ratedCapacity: 180
  },
  {
    nameZh: "辦公與公共區域",
    nameEn: "Office & Common Area",
    icon: "building-2",
    mqttTopic: "factory/power/office",
    ratedCapacity: 240
  },
  {
    nameZh: "充電設備/綠能設施",
    nameEn: "Charging & Green Facilities",
    icon: "battery-charging",
    mqttTopic: "factory/power/ev_green",
    ratedCapacity: 320
  },
  {
    nameZh: "其他基礎設施",
    nameEn: "Infrastructure",
    icon: "settings-2",
    mqttTopic: "factory/power/infrastructure",
    ratedCapacity: 200
  }
] as const;

const playbackPages = [
  { pageKey: "overview", route: "/overview", labelZh: "總覽", labelEn: "Overview", displayOrder: 1 },
  { pageKey: "solar", route: "/solar", labelZh: "太陽能", labelEn: "Solar", displayOrder: 2 },
  {
    pageKey: "factory-circuit",
    route: "/factory-circuit",
    labelZh: "廠區迴路",
    labelEn: "Factory Circuit",
    displayOrder: 3
  },
  { pageKey: "images", route: "/images", labelZh: "綠能影像", labelEn: "Images", displayOrder: 4 },
  {
    pageKey: "sustainability",
    route: "/sustainability",
    labelZh: "永續成果",
    labelEn: "Sustainability",
    displayOrder: 5
  }
] as const;

export function seedDatabase() {
  const database = getDatabase();

  const upsertSetting = database.prepare(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
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
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM circuit_configs WHERE mqtt_topic = ?
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

  database.transaction(() => {
    upsertSetting.run("co2_factor", "0.494");
    upsertSetting.run("data_mode", "mqtt");

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
        circuitConfig.nameZh,
        circuitConfig.nameEn,
        circuitConfig.icon,
        "kW",
        circuitConfig.mqttTopic,
        ["production", "hvac", "lighting", "office", "ev", "infrastructure"][index],
        circuitConfig.ratedCapacity,
        0,
        circuitConfig.ratedCapacity * 0.7,
        circuitConfig.ratedCapacity * 0.7,
        circuitConfig.ratedCapacity * 0.9,
        circuitConfig.ratedCapacity * 0.9,
        circuitConfig.ratedCapacity,
        index + 1,
        1,
        circuitConfig.mqttTopic
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
    }

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
      ON CONFLICT(id) DO UPDATE SET
        autoplay = excluded.autoplay,
        loop = excluded.loop,
        start_page = excluded.start_page,
        transition_type = excluded.transition_type,
        transition_speed = excluded.transition_speed,
        schedule_enabled = excluded.schedule_enabled,
        schedule_start = excluded.schedule_start,
        schedule_end = excluded.schedule_end,
        repeat_days = excluded.repeat_days,
        idle_mode = excluded.idle_mode,
        idle_timeout = excluded.idle_timeout,
        brightness = excluded.brightness,
        orientation = excluded.orientation,
        updated_at = CURRENT_TIMESTAMP
    `).run(1, 1, 1, 0, "fade", 1000, 0, "08:00", "18:00", "1,2,3,4,5", 0, 300, 100, "landscape");
  })();
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
