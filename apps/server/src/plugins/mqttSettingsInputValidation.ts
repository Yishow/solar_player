import type { FastifyInstance } from "fastify";

type MqttSettingsMutationBody = {
  clientId?: unknown;
  dataMode?: unknown;
  host?: unknown;
  messageTimeout?: unknown;
  password?: unknown;
  port?: unknown;
  reconnectInterval?: unknown;
  username?: unknown;
};

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

export function validateMqttSettingsMutationBody(body: unknown) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return "MQTT settings body must be an object";
  }

  const input = body as MqttSettingsMutationBody;
  if (input.dataMode !== undefined && input.dataMode !== "mqtt" && input.dataMode !== "mock") {
    return "dataMode must be mqtt or mock";
  }
  if (!isOptionalString(input.host)) {
    return "host must be a string";
  }
  if (!isOptionalString(input.username)) {
    return "username must be a string";
  }
  if (!isOptionalString(input.password)) {
    return "password must be a string";
  }
  if (!isOptionalString(input.clientId)) {
    return "clientId must be a string";
  }
  if (
    input.port !== undefined
    && (!Number.isInteger(input.port) || (input.port as number) < 1 || (input.port as number) > 65_535)
  ) {
    return "port must be an integer between 1 and 65535";
  }
  if (
    input.reconnectInterval !== undefined
    && (
      typeof input.reconnectInterval !== "number"
      || !Number.isFinite(input.reconnectInterval)
      || input.reconnectInterval < 0
    )
  ) {
    return "reconnectInterval must be a non-negative finite number";
  }
  if (
    input.messageTimeout !== undefined
    && (
      typeof input.messageTimeout !== "number"
      || !Number.isFinite(input.messageTimeout)
      || input.messageTimeout <= 0
    )
  ) {
    return "messageTimeout must be a positive finite number";
  }

  return null;
}

export function installMqttSettingsInputValidation(app: FastifyInstance) {
  app.addHook("preValidation", async (request, reply) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const isSettingsSave = request.method === "PUT" && pathname === "/api/settings/mqtt";
    const isConnectionTest = request.method === "POST" && pathname === "/api/settings/mqtt/test";
    if (!isSettingsSave && !isConnectionTest) {
      return;
    }

    const error = validateMqttSettingsMutationBody(request.body);
    if (!error) {
      return;
    }

    return reply.status(400).send({
      success: false,
      error,
      timestamp: new Date().toISOString()
    });
  });
}
