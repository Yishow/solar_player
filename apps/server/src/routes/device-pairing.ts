import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
  authenticateDeviceCredential,
  DeviceCredentialServiceError,
  exchangePairingToken,
  issuePairingToken,
  revokeDeviceCredentials
} from "../services/deviceCredentialService.js";

const DEVICE_CREDENTIAL_COOKIE_NAME = "solar_device_credential";

function parseDeviceId(value: string) {
  const deviceId = Number(value);
  if (!Number.isInteger(deviceId) || deviceId <= 0) {
    throw new DeviceCredentialServiceError(
      "device_not_found",
      "Invalid Device id",
      404
    );
  }
  return deviceId;
}

function sendError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof DeviceCredentialServiceError)) {
    throw error;
  }
  return reply.status(error.statusCode).send({
    code: error.code,
    error: error.message,
    success: false,
    timestamp: new Date().toISOString()
  });
}

function isLoopbackAddress(address: string) {
  return (
    address === "127.0.0.1" ||
    address === "::1" ||
    address === "::ffff:127.0.0.1"
  );
}

function requireSecurePairingTransport(request: FastifyRequest) {
  if (request.protocol === "https") {
    return true;
  }
  if (isLoopbackAddress(request.ip)) {
    return false;
  }
  throw new DeviceCredentialServiceError(
    "pairing_https_required",
    "Remote Device pairing requires HTTPS"
  );
}

export function serializeDeviceCredentialCookie(credential: string, secure: boolean) {
  return [
    `${DEVICE_CREDENTIAL_COOKIE_NAME}=${credential}`,
    "Max-Age=31536000",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : null
  ]
    .filter((part): part is string => part !== null)
    .join("; ");
}

function readDeviceCredentialCookie(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    throw new DeviceCredentialServiceError(
      "credential_missing",
      "Device Credential Cookie is missing",
      401
    );
  }

  const prefix = `${DEVICE_CREDENTIAL_COOKIE_NAME}=`;
  const values = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith(prefix))
    .map((entry) => entry.slice(prefix.length));

  if (values.length === 0) {
    throw new DeviceCredentialServiceError(
      "credential_missing",
      "Device Credential Cookie is missing",
      401
    );
  }
  const value = values[0];
  if (values.length !== 1 || !value) {
    throw new DeviceCredentialServiceError(
      "credential_invalid",
      "Device Credential Cookie is invalid",
      401
    );
  }

  return value;
}

const devicePairingRoute: FastifyPluginAsync = async (app) => {
  app.post<{ Params: { id: string } }>(
    "/api/devices/:id/pairing-tokens",
    async (request, reply) => {
      if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
        return app.managementAccess.deny(reply);
      }
      try {
        return reply.status(201).send({
          data: issuePairingToken(parseDeviceId(request.params.id)),
          success: true,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post<{ Body: { token?: unknown } }>(
    "/api/device-pairing/exchange",
    async (request, reply) => {
      try {
        const secure = requireSecurePairingTransport(request);
        const result = exchangePairingToken(request.body?.token);
        return reply
          .header(
            "set-cookie",
            serializeDeviceCredentialCookie(result.credential, secure)
          )
          .status(204)
          .send();
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/devices/:id/credentials/revoke",
    async (request, reply) => {
      if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
        return app.managementAccess.deny(reply);
      }
      try {
        return {
          data: revokeDeviceCredentials(parseDeviceId(request.params.id)),
          success: true,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get("/api/device-pairing/status", async (request, reply) => {
    reply.header("cache-control", "no-store");
    try {
      const identity = authenticateDeviceCredential(
        readDeviceCredentialCookie(request.headers.cookie)
      );
      return {
        data: {
          clientId: identity.clientId,
          deviceId: identity.deviceId,
          paired: true
        },
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });
};

export default devicePairingRoute;
