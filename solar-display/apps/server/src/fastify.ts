import type { MqttClientService } from "./mqtt/MqttClientService.js";

declare module "fastify" {
  interface FastifyInstance {
    mqttClientService: MqttClientService;
  }
}

export {};
