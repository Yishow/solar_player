import type { FastifyPluginAsync, FastifyReply } from "fastify";
import {
  createDevice,
  deleteDevice,
  DeviceGroupServiceError,
  listDevices,
  readDevice,
  updateDevice
} from "../services/deviceGroupService.js";

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new DeviceGroupServiceError("device_not_found", "Invalid Device id");
  }
  return id;
}

function sendError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof DeviceGroupServiceError)) {
    throw error;
  }
  return reply.status(error.statusCode).send({
    code: error.code,
    error: error.message,
    success: false,
    timestamp: new Date().toISOString()
  });
}

const devicesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/devices", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    return { data: listDevices(), success: true, timestamp: new Date().toISOString() };
  });

  app.get<{ Params: { id: string } }>("/api/devices/:id", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    try {
      return {
        data: readDevice(parseId(request.params.id)),
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post<{ Body: Record<string, unknown> }>("/api/devices", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    try {
      return reply.status(201).send({
        data: createDevice(request.body ?? {}),
        success: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.put<{ Body: Record<string, unknown>; Params: { id: string } }>(
    "/api/devices/:id",
    async (request, reply) => {
      if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
        return app.managementAccess.deny(reply);
      }
      try {
        return {
          data: updateDevice(parseId(request.params.id), request.body ?? {}),
          success: true,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.delete<{ Params: { id: string } }>("/api/devices/:id", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    try {
      return {
        data: deleteDevice(parseId(request.params.id)),
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });
};

export default devicesRoute;
