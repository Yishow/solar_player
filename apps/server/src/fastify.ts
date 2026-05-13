import type { MqttClientService } from "./mqtt/MqttClientService.js";
import type { SocketService } from "./realtime/SocketService.js";

declare module "fastify" {
  interface FastifyInstance {
    mqttClientService: MqttClientService;
    socketService: SocketService;
  }
}

export {};
