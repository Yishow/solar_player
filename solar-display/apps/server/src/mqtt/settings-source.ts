export type MqttSettingsRow = {
  broker_host: string | null;
  broker_port: number | null;
  username: string | null;
  password: string | null;
  client_id: string | null;
  reconnect_interval: number | null;
  message_timeout: number | null;
  data_mode: string | null;
};

type MqttEnv = Partial<Record<string, string | undefined>>;

const defaultMqttSettings: Required<MqttSettingsRow> = {
  broker_host: "localhost",
  broker_port: 1883,
  username: "",
  password: "",
  client_id: "solar-display-player",
  reconnect_interval: 5000,
  message_timeout: 30,
  data_mode: "mqtt"
};

function readNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function readString(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

function readDataMode(value: string | undefined): "mqtt" | "mock" | null {
  const normalized = readString(value);

  if (normalized === "mqtt" || normalized === "mock") {
    return normalized;
  }

  return null;
}

export function getEnvMqttSettings(env: MqttEnv = process.env): Required<MqttSettingsRow> {
  return {
    broker_host:
      readString(env.MQTT_BROKER) ??
      readString(env.MQTT_HOST) ??
      defaultMqttSettings.broker_host,
    broker_port: readNumber(env.MQTT_PORT) ?? defaultMqttSettings.broker_port,
    username: readString(env.MQTT_USERNAME) ?? defaultMqttSettings.username,
    password: env.MQTT_PASSWORD ?? defaultMqttSettings.password,
    client_id: readString(env.MQTT_CLIENT_ID) ?? defaultMqttSettings.client_id,
    reconnect_interval:
      readNumber(env.MQTT_RECONNECT_INTERVAL) ?? defaultMqttSettings.reconnect_interval,
    message_timeout: readNumber(env.MQTT_MESSAGE_TIMEOUT) ?? defaultMqttSettings.message_timeout,
    data_mode: readDataMode(env.MQTT_DATA_MODE) ?? defaultMqttSettings.data_mode
  };
}

export function hasExplicitMqttEnvSettings(env: MqttEnv = process.env): boolean {
  return [
    env.MQTT_BROKER,
    env.MQTT_HOST,
    env.MQTT_PORT,
    env.MQTT_USERNAME,
    env.MQTT_PASSWORD,
    env.MQTT_CLIENT_ID,
    env.MQTT_RECONNECT_INTERVAL,
    env.MQTT_MESSAGE_TIMEOUT,
    env.MQTT_DATA_MODE
  ].some((value) => value !== undefined);
}

export function shouldBootstrapStoredMqttSettings(row?: MqttSettingsRow | null): boolean {
  if (!row) {
    return true;
  }

  return (
    (row.broker_host?.trim() || defaultMqttSettings.broker_host) === defaultMqttSettings.broker_host &&
    (row.broker_port ?? defaultMqttSettings.broker_port) === defaultMqttSettings.broker_port &&
    (row.username ?? defaultMqttSettings.username) === defaultMqttSettings.username &&
    (row.password ?? defaultMqttSettings.password) === defaultMqttSettings.password &&
    (row.client_id ?? defaultMqttSettings.client_id) === defaultMqttSettings.client_id &&
    (row.reconnect_interval ?? defaultMqttSettings.reconnect_interval) ===
      defaultMqttSettings.reconnect_interval &&
    (row.message_timeout ?? defaultMqttSettings.message_timeout) ===
      defaultMqttSettings.message_timeout &&
    ((row.data_mode === "mock" ? "mock" : "mqtt") === defaultMqttSettings.data_mode)
  );
}

export function resolveMqttSettings(
  env: MqttEnv = process.env,
  row?: MqttSettingsRow | null
): Required<MqttSettingsRow> {
  const envSettings = getEnvMqttSettings(env);

  return {
    broker_host: row?.broker_host?.trim() || envSettings.broker_host,
    broker_port: row?.broker_port ?? envSettings.broker_port,
    username: row?.username ?? envSettings.username,
    password: row?.password ?? envSettings.password,
    client_id: row?.client_id ?? envSettings.client_id,
    reconnect_interval: row?.reconnect_interval ?? envSettings.reconnect_interval,
    message_timeout: row?.message_timeout ?? envSettings.message_timeout,
    data_mode: row?.data_mode === "mock" ? "mock" : row?.data_mode === "mqtt" ? "mqtt" : envSettings.data_mode
  };
}
