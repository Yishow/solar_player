import type { FastifyPluginAsync, FastifyReply } from "fastify";
import type { IncomingHttpHeaders } from "node:http";
import { config } from "../config.js";
import {
  buildManagementSessionCookie,
  isUndeliverableCrossHostManagementSession,
  matchesManagementAccessTokenHeader,
  readManagementSessionCookie
} from "../plugins/managementAuth.js";
import {
  disableManagementPassword,
  readManagementPasswordState,
  setManagementPassword,
  verifyManagementPassword
} from "../services/managementPasswordService.js";
import {
  issueManagementSession,
  revokeAllManagementSessions,
  revokeManagementSession,
  verifyManagementSession
} from "../services/managementSessionService.js";

function hasAccessToken(request: { headers: IncomingHttpHeaders }) {
  return matchesManagementAccessTokenHeader(request.headers, config.managementAccessToken);
}

function validSession(request: { headers: IncomingHttpHeaders }) {
  return verifyManagementSession(readManagementSessionCookie(request.headers));
}

/**
 * These endpoints sit outside the shared management mutation boundary — that
 * boundary would deny the very requests needed to unlock — so each one carries
 * its own condition. Failures still report the common management failure fields
 * on top of whatever the endpoint already told the caller.
 */
function fail(
  reply: FastifyReply,
  statusCode: number,
  error: string,
  extra: Record<string, unknown> = {}
) {
  return reply.status(statusCode).send({
    success: false,
    error,
    timestamp: new Date().toISOString(),
    ...extra
  });
}

const managementAuthRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/management-auth/state", async (request, reply) => {
    // Readable without a management session — the unlock surface needs it to
    // decide whether to present itself — but not to arbitrary callers, who
    // would otherwise learn whether the gate is on and when a cooldown ends.
    if (!app.managementAccess.isTrustedManagementOriginRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    const state = readManagementPasswordState();
    return {
      enabled: state.enabled,
      authenticated: hasAccessToken(request) || validSession(request),
      lockedUntil: state.lockedUntil
    };
  });

  app.post<{ Body: { password?: unknown } }>("/api/management-auth/unlock", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementOriginRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    const result = verifyManagementPassword(request.body?.password);
    if (result.locked) {
      return fail(reply, 429, "Locked out", {
        authenticated: false,
        locked: true,
        lockedUntil: result.lockedUntil
      });
    }
    if (!result.ok) {
      return fail(reply, 401, "Authentication failed", { authenticated: false });
    }

    const session = issueManagementSession();
    if (isUndeliverableCrossHostManagementSession(request)) {
      // The cookie is still issued because a cross-host origin may nonetheless
      // be same-site, where Strict works. Where it is genuinely cross-site the
      // browser will drop it and the gate will never open — say so rather than
      // leaving the operator to guess.
      request.log.warn(
        { origin: request.headers.origin },
        "Management session cookie issued to a cross-host origin over an insecure connection; SameSite=None requires HTTPS"
      );
    }
    reply.header("Set-Cookie", buildManagementSessionCookie(request, {
      maxAgeSeconds: Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000),
      value: session.token
    }));
    return { authenticated: true };
  });

  app.post("/api/management-auth/lock", async (request, reply) => {
    // Trusted origin only — a session is deliberately not required, because
    // locking has to stay available to a caller whose session already expired.
    if (!app.managementAccess.isTrustedManagementOriginRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    revokeManagementSession(readManagementSessionCookie(request.headers));
    reply.header("Set-Cookie", buildManagementSessionCookie(request, { value: null }));
    return { authenticated: false };
  });

  app.put<{ Body: { enabled?: unknown; newPassword?: unknown; currentPassword?: unknown } }>("/api/management-auth/password", async (request, reply) => {
    const body = request.body ?? {};
    if (typeof body.enabled !== "boolean") {
      return fail(reply, 400, "Invalid request");
    }

    const tokenAccess = hasAccessToken(request);
    const sessionAccess = validSession(request);
    if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    // The dormant gate must be enable-able by an already trusted management
    // caller; once enabled, only a session or the recovery token may change it.
    if (!tokenAccess && !sessionAccess && readManagementPasswordState().enabled) {
      return app.managementAccess.deny(reply);
    }

    if (body.enabled && (typeof body.newPassword !== "string" || body.newPassword.trim().length < 8)) {
      return fail(reply, 400, "New password is required");
    }

    if (!tokenAccess && readManagementPasswordState().enabled) {
      // This verification advances the same failure count and cooldown as an
      // unlock, so it has to report a cooldown the same way unlock does.
      const current = verifyManagementPassword(body.currentPassword);
      if (current.locked) {
        return fail(reply, 429, "Locked out", {
          authenticated: false,
          locked: true,
          lockedUntil: current.lockedUntil
        });
      }
      if (!current.ok) {
        return fail(reply, 401, "Authentication failed", { authenticated: false });
      }
    }

    if (body.enabled) {
      setManagementPassword(body.newPassword as string, true);
    } else {
      disableManagementPassword();
    }
    revokeAllManagementSessions();
    reply.header("Set-Cookie", buildManagementSessionCookie(request, { value: null }));
    return { enabled: body.enabled, authenticated: false };
  });
};

export default managementAuthRoute;
