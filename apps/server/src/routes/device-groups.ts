import type { FastifyPluginAsync, FastifyReply } from "fastify";
import {
  createDeviceGroup,
  deleteDeviceGroup,
  DeviceGroupServiceError,
  listDeviceGroups,
  readDeviceGroup,
  updateDeviceGroup
} from "../services/deviceGroupService.js";

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new DeviceGroupServiceError("group_not_found", "Invalid Device Group id");
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

const deviceGroupsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/device-groups", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    return { data: listDeviceGroups(), success: true, timestamp: new Date().toISOString() };
  });

  app.get<{ Params: { id: string } }>("/api/device-groups/:id", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    try {
      return {
        data: readDeviceGroup(parseId(request.params.id)),
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post<{ Body: Record<string, unknown> }>("/api/device-groups", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    try {
      return reply.status(201).send({
        data: createDeviceGroup(request.body ?? {}),
        success: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.put<{ Body: Record<string, unknown>; Params: { id: string } }>(
    "/api/device-groups/:id",
    async (request, reply) => {
      if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
        return app.managementAccess.deny(reply);
      }
      try {
        return {
          data: updateDeviceGroup(parseId(request.params.id), request.body ?? {}),
          success: true,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.delete<{ Params: { id: string } }>("/api/device-groups/:id", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    try {
      return {
        data: deleteDeviceGroup(parseId(request.params.id)),
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });
};

export default deviceGroupsRoute;
