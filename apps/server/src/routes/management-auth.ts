import type { FastifyPluginAsync } from "fastify";
import { config } from "../config.js";
import { MANAGEMENT_ACCESS_TOKEN_HEADER, MANAGEMENT_SESSION_COOKIE, readManagementSessionCookie } from "../plugins/managementAuth.js";
import { disableManagementPassword, readManagementPasswordState, setManagementPassword, verifyManagementPassword } from "../services/managementPasswordService.js";
import { issueManagementSession, revokeAllManagementSessions, revokeManagementSession, verifyManagementSession } from "../services/managementSessionService.js";

const COOKIE_BASE = `${MANAGEMENT_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict`;
function hasAccessToken(request: { headers: Record<string, string | string[] | undefined> }) {
  const value = request.headers[MANAGEMENT_ACCESS_TOKEN_HEADER];
  return typeof value === "string" && Boolean(config.managementAccessToken) && value.trim() === config.managementAccessToken;
}
function validSession(request: { headers: Record<string, string | string[] | undefined> }) {
  return verifyManagementSession(readManagementSessionCookie(request.headers));
}
const managementAuthRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/management-auth/state", async (request) => {
    const state = readManagementPasswordState();
    return { enabled: state.enabled, authenticated: hasAccessToken(request) || validSession(request), lockedUntil: state.lockedUntil };
  });

  app.post<{ Body: { password?: unknown } }>("/api/management-auth/unlock", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementOriginRequest(request)) return app.managementAccess.deny(reply);
    const result = verifyManagementPassword(request.body?.password);
    if (result.locked) return reply.status(429).send({ authenticated: false, locked: true, lockedUntil: result.lockedUntil });
    if (!result.ok) return reply.status(401).send({ authenticated: false, error: "Authentication failed" });
    const session = issueManagementSession();
    reply.header("Set-Cookie", `${MANAGEMENT_SESSION_COOKIE}=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000)}`);
    return { authenticated: true };
  });

  app.post("/api/management-auth/lock", async (request, reply) => {
    revokeManagementSession(readManagementSessionCookie(request.headers));
    reply.header("Set-Cookie", COOKIE_BASE);
    return { authenticated: false };
  });

  app.put<{ Body: { enabled?: unknown; newPassword?: unknown; currentPassword?: unknown } }>("/api/management-auth/password", async (request, reply) => {
    const body = request.body ?? {};
    if (typeof body.enabled !== "boolean") return reply.status(400).send({ error: "Invalid request" });
    const tokenAccess = hasAccessToken(request);
    const sessionAccess = validSession(request);
    if (!app.managementAccess.isTrustedManagementMutationRequest(request)) return app.managementAccess.deny(reply);
    // The dormant gate must be enable-able by an already trusted management
    // caller; once enabled, only a session or the recovery token may change it.
    if (!tokenAccess && !sessionAccess && readManagementPasswordState().enabled) return app.managementAccess.deny(reply);
    if (body.enabled && (typeof body.newPassword !== "string" || body.newPassword.trim().length < 8)) return reply.status(400).send({ error: "New password is required" });
    if (!tokenAccess && readManagementPasswordState().enabled && !verifyManagementPassword(body.currentPassword).ok) return reply.status(401).send({ error: "Authentication failed" });
    if (body.enabled) setManagementPassword(body.newPassword as string, true);
    else disableManagementPassword();
    revokeAllManagementSessions();
    reply.header("Set-Cookie", COOKIE_BASE);
    return { enabled: body.enabled, authenticated: false };
  });
};
export default managementAuthRoute;
