import type { DisplayClientContext } from "@solar-display/shared";
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest
} from "fastify";
import {
  DisplayClientContextServiceError,
  resolveDisplayClientContext
} from "../services/displayClientContextService.js";

const DEVICE_CREDENTIAL_COOKIE_NAME = "solar_device_credential";

export function readDeviceCredentialCookie(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    throw new DisplayClientContextServiceError(
      "device_unpaired",
      "Display Client is not paired",
      401
    );
  }

  const prefix = `${DEVICE_CREDENTIAL_COOKIE_NAME}=`;
  const values = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith(prefix))
    .map((entry) => entry.slice(prefix.length));
  const value = values[0];

  if (values.length !== 1 || !value) {
    throw new DisplayClientContextServiceError(
      "device_unpaired",
      "Display Client is not paired",
      401
    );
  }

  return value;
}

function sendContextError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof DisplayClientContextServiceError)) {
    throw error;
  }

  return reply.status(error.statusCode).send({
    code: error.code,
    error: error.message,
    success: false,
    timestamp: new Date().toISOString()
  });
}

export async function deviceContextPlugin(app: FastifyInstance) {
  app.decorateRequest("displayClientContext", null);
  app.decorate(
    "requireDisplayClientContext",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        request.displayClientContext = resolveDisplayClientContext(
          readDeviceCredentialCookie(request.headers.cookie)
        );
      } catch (error) {
        if (error instanceof DisplayClientContextServiceError) {
          try {
            app.unpairedDisplayAccessRegistry.record(
              error.code,
              new URL(request.url, "http://localhost").pathname
            );
          } catch (recordingError) {
            app.log.warn({ err: recordingError }, "Unable to record denied display access");
          }
        }
        return sendContextError(reply, error);
      }
    }
  );
}

export function requireResolvedDisplayClientContext(
  request: FastifyRequest
): DisplayClientContext {
  if (!request.displayClientContext) {
    throw new Error("Display Client Context pre-handler was not applied");
  }
  return request.displayClientContext;
}
