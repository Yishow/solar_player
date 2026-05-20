import type { ManagementAccessControl } from "./plugins/managementAuth.js";
import type { MqttClientService } from "./mqtt/MqttClientService.js";
import type { SocketService } from "./realtime/SocketService.js";

declare module "fastify" {
  interface FastifyInstance {
    managementAccess: ManagementAccessControl;
    mqttClientService: MqttClientService;
    socketService: SocketService;
  }
}

export {};
