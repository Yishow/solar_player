import type { ManagementAccessControl } from "./plugins/managementAuth.js";
import type { MqttClientService } from "./mqtt/MqttClientService.js";
import type { SocketService } from "./realtime/SocketService.js";
import type { DisplayClientContext } from "@solar-display/shared";
import type { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    managementAccess: ManagementAccessControl;
    mqttClientService: MqttClientService;
    requireDisplayClientContext: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<unknown>;
    socketService: SocketService;
  }

  interface FastifyRequest {
    displayClientContext: DisplayClientContext | null;
  }
}

export {};
