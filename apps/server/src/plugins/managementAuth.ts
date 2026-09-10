import { timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
  MANAGEMENT_ACCESS_DENIED_CODE,
  MANAGEMENT_ACCESS_DENIED_MESSAGE,
  type ManagementAccessDeniedEnvelope,
  type ManagementSocketSessionClass
} from "@solar-display/shared";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
export const MANAGEMENT_ACCESS_TOKEN_HEADER = "x-solar-management-token";
export const MANAGEMENT_SESSION_COOKIE = "solar_management_session";

type RequestLike = {
  headers: IncomingHttpHeaders;
  ip?: string;
  method?: string;
  protocol?: string;
  url?: string;
};

export type ManagementSessionCookieSameSite = "None" | "Strict";

type SocketHandshakeLike = {
  address?: string;
  auth?: Record<string, unknown>;
  headers: IncomingHttpHeaders;
};

type ManagementAccessDecision = {
  normalizedOrigin: string | null;
  reason:
    | "access-token"
    | "loopback-origin"
    | "loopback-remote"
    | "same-host-origin"
    | "same-host-referer"
    | "trusted-origin"
    | "untrusted";
  trusted: boolean;
  passwordGateSatisfied: boolean;
};

export type ManagementAccessControl = {
  classifySocketSession: (handshake: SocketHandshakeLike) => ManagementSocketSessionClass;
  createDeniedEnvelope: () => ManagementAccessDeniedEnvelope;
  deny: (reply: FastifyReply) => unknown;
  isTrustedManagementOriginRequest: (request: RequestLike) => boolean;
  isTrustedManagementMutationRequest: (request: FastifyRequest) => boolean;
  isTrustedManagementReadRequest: (request: FastifyRequest) => boolean;
  isTrustedManagementRequestLike: (request: RequestLike) => boolean;
};

function readHeaderValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    return readHeaderValue(value[0]);
  }

  return null;
}

export function readManagementSessionCookie(headers: IncomingHttpHeaders): string | null {
  const cookie = readHeaderValue(headers.cookie);
  if (!cookie) return null;
  const entry = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${MANAGEMENT_SESSION_COOKIE}=`));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(MANAGEMENT_SESSION_COOKIE.length + 1));
  } catch {
    return null;
  }
}

function normalizeOrigin(origin: string): string | null {
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return null;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}

function isLoopbackOrigin(origin: string): boolean {
  try {
    return isLoopbackHostname(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function isLoopbackRemoteAddress(address: string | undefined): boolean {
  if (!address) {
    return false;
  }

  return (
    address === "127.0.0.1"
    || address === "::1"
    || address === "::ffff:127.0.0.1"
    || address === "localhost"
  );
}

function matchesConfiguredOrigin(origin: string, trustedOrigins: string[]): boolean {
  return trustedOrigins.includes(origin);
}

function isSameHostOrigin(
  origin: string,
  requestHost: string | null
): boolean {
  if (!requestHost) {
    return false;
  }

  try {
    return new URL(origin).hostname.toLowerCase() === new URL(`http://${requestHost}`).hostname.toLowerCase();
  } catch {
    return false;
  }
}

function isSecureRequest(request: RequestLike): boolean {
  const forwardedProto = readHeaderValue(request.headers["x-forwarded-proto"]);
  const protocol = forwardedProto?.split(",")[0]?.trim() ?? request.protocol;
  return protocol?.toLowerCase() === "https";
}

/**
 * A management origin the server already trusts may live on another host. A
 * `SameSite=Strict` cookie is never returned on those requests, so the gate
 * could never open for them. `None` is the only attribute a browser will send
 * cross-site, and it requires `Secure` — so an insecure cross-host caller keeps
 * `Strict` and is reported by the caller instead of being silently broken.
 */
export function resolveManagementSessionCookieSameSite(
  request: RequestLike
): ManagementSessionCookieSameSite {
  const origin = readHeaderValue(request.headers.origin);
  if (!origin) {
    return "Strict";
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin || isSameHostOrigin(normalizedOrigin, readHeaderValue(request.headers.host))) {
    return "Strict";
  }

  return isSecureRequest(request) ? "None" : "Strict";
}

export function isUndeliverableCrossHostManagementSession(request: RequestLike): boolean {
  const origin = readHeaderValue(request.headers.origin);
  if (!origin) {
    return false;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin || isSameHostOrigin(normalizedOrigin, readHeaderValue(request.headers.host))) {
    return false;
  }

  return !isSecureRequest(request);
}

export function buildManagementSessionCookie(
  request: RequestLike,
  session: { maxAgeSeconds?: number; value: string | null }
): string {
  const sameSite = resolveManagementSessionCookieSameSite(request);
  const parts = [
    `${MANAGEMENT_SESSION_COOKIE}=${session.value === null ? "" : encodeURIComponent(session.value)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`
  ];

  // `Secure` keeps the cookie off plaintext connections; `SameSite=None` also
  // requires it, and that combination is only reachable on a secure connection,
  // so the two conditions never disagree. A plaintext connection must not get
  // `Secure` or the browser discards the cookie outright.
  if (sameSite === "None" || isSecureRequest(request)) {
    parts.push("Secure");
  }

  // Clearing reuses the same attributes so the replacement cookie actually
  // overwrites the stored one instead of sitting beside it.
  parts.push(`Max-Age=${session.value === null ? 0 : Math.max(0, Math.floor(session.maxAgeSeconds ?? 0))}`);

  return parts.join("; ");
}

function isSameHostReferer(
  headers: IncomingHttpHeaders,
  requestHost: string | null
) {
  const referer = readHeaderValue(headers.referer);
  if (!referer) {
    return false;
  }

  const normalizedRefererOrigin = normalizeOrigin(referer);
  if (!normalizedRefererOrigin) {
    return false;
  }

  return isSameHostOrigin(normalizedRefererOrigin, requestHost);
}

/**
 * The single place a presented management access token is compared. A second
 * implementation elsewhere could admit a caller this one would reject, so every
 * transport only extracts its value and hands it here. The comparison is
 * constant time: the token is high-entropy, but a divergent-timing compare costs
 * nothing to avoid and the password path already uses `timingSafeEqual`. Byte
 * lengths are checked first because `timingSafeEqual` throws on a mismatch, and
 * character counts can agree while UTF-8 byte lengths do not.
 */
function matchesManagementAccessTokenValue(
  presented: string | null,
  configured: string | null
): boolean {
  if (!configured || !presented) {
    return false;
  }

  const presentedBytes = Buffer.from(presented, "utf8");
  const configuredBytes = Buffer.from(configured, "utf8");
  return presentedBytes.length === configuredBytes.length
    && timingSafeEqual(presentedBytes, configuredBytes);
}

export function matchesManagementAccessTokenHeader(
  headers: IncomingHttpHeaders,
  managementAccessToken: string | null
): boolean {
  return matchesManagementAccessTokenValue(
    readHeaderValue(headers[MANAGEMENT_ACCESS_TOKEN_HEADER]),
    managementAccessToken
  );
}

// Only a string is a token here; coercing an array or object could turn it into
// the configured value.
function matchesSocketAuthAccessToken(
  auth: Record<string, unknown> | undefined,
  managementAccessToken: string | null
): boolean {
  const presented = typeof auth?.managementAccessToken === "string" ? auth.managementAccessToken.trim() : null;
  return matchesManagementAccessTokenValue(presented, managementAccessToken);
}

function isManagementMutationRequest(request: FastifyRequest): boolean {
  if (!MUTATION_METHODS.has(request.method.toUpperCase())) {
    return false;
  }

  const pathname = new URL(request.url, "http://localhost").pathname;
  return pathname.startsWith("/api/") && !pathname.startsWith("/api/management-auth/");
}

export function parseManagementTrustedOrigins(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => normalizeOrigin(entry.trim()))
        .filter((entry): entry is string => entry !== null)
    )
  );
}

export function isTrustedManagementCorsOrigin(
  origin: string | undefined,
  trustedOrigins: string[]
): boolean {
  if (!origin) {
    return false;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }

  return isLoopbackOrigin(normalizedOrigin) || matchesConfiguredOrigin(normalizedOrigin, trustedOrigins);
}

export function isTrustedManagementCorsRequest(
  request: RequestLike,
  trustedOrigins: string[]
): boolean {
  const origin = readHeaderValue(request.headers.origin);
  if (!origin) {
    return false;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }

  return (
    isLoopbackOrigin(normalizedOrigin)
    || matchesConfiguredOrigin(normalizedOrigin, trustedOrigins)
    || isSameHostOrigin(normalizedOrigin, readHeaderValue(request.headers.host))
  );
}

function classifyManagementRequest(
  request: RequestLike,
  trustedOrigins: string[],
  managementAccessToken: string | null,
  passwordGateEnabled = () => false,
  isManagementSessionValid = (_request: RequestLike) => false
): ManagementAccessDecision {
  // The gate is satisfied when it is off, or when this request carries a valid
  // management session. Every trusted-origin outcome below shares this one
  // answer so the condition cannot drift between them. The access-token and
  // untrusted outcomes deliberately do not use it: the token is the recovery
  // path and always satisfies, and an untrusted caller never does.
  const satisfiesPasswordGate = () =>
    !passwordGateEnabled() || isManagementSessionValid(request);

  if (matchesManagementAccessTokenHeader(request.headers, managementAccessToken)) {
    return {
      normalizedOrigin: null,
      reason: "access-token",
      trusted: true,
      passwordGateSatisfied: true
    };
  }

  const requestHost = readHeaderValue(request.headers.host);
  const origin = readHeaderValue(request.headers.origin);

  if (!origin) {
    const sameHostReferer = isSameHostReferer(request.headers, requestHost);
    const trusted = sameHostReferer || isLoopbackRemoteAddress(request.ip);
    return {
      normalizedOrigin: null,
      reason: sameHostReferer
        ? "same-host-referer"
        : trusted ? "loopback-remote" : "untrusted",
      trusted,
      passwordGateSatisfied: satisfiesPasswordGate()
    };
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return {
      normalizedOrigin: null,
      reason: "untrusted",
      trusted: false,
      passwordGateSatisfied: false
    };
  }

  if (isLoopbackOrigin(normalizedOrigin)) {
    return {
      normalizedOrigin,
      reason: "loopback-origin",
      trusted: true,
      passwordGateSatisfied: satisfiesPasswordGate()
    };
  }

  if (matchesConfiguredOrigin(normalizedOrigin, trustedOrigins)) {
    return {
      normalizedOrigin,
      reason: "trusted-origin",
      trusted: true,
      passwordGateSatisfied: satisfiesPasswordGate()
    };
  }

  if (isSameHostOrigin(normalizedOrigin, requestHost)) {
    return {
      normalizedOrigin,
      reason: "same-host-origin",
      trusted: true,
      passwordGateSatisfied: satisfiesPasswordGate()
    };
  }

  return {
    normalizedOrigin,
    reason: "untrusted",
    trusted: false,
    passwordGateSatisfied: false
  };
}

function resolveRequestedSocketSessionClass(
  auth: Record<string, unknown> | undefined
): ManagementSocketSessionClass {
  return auth?.sessionClass === "management-trusted" ? "management-trusted" : "playback-safe";
}

export function createManagementAccessDeniedEnvelope(): ManagementAccessDeniedEnvelope {
  return {
    access: "denied",
    code: MANAGEMENT_ACCESS_DENIED_CODE,
    error: MANAGEMENT_ACCESS_DENIED_MESSAGE,
    requiredRole: "management-trusted",
    success: false,
    timestamp: new Date().toISOString()
  };
}

export function createManagementAccessControl(options: {
  managementAccessToken: string | null;
  trustedOrigins: string[];
  passwordGateEnabled?: () => boolean;
  isManagementSessionValid?: (request: RequestLike) => boolean;
}): ManagementAccessControl {
  const passwordGateEnabled = options.passwordGateEnabled ?? (() => false);
  const isManagementSessionValid = options.isManagementSessionValid ?? (() => false);
  const classify = (request: RequestLike) => classifyManagementRequest(
    request,
    options.trustedOrigins,
    options.managementAccessToken,
    passwordGateEnabled,
    isManagementSessionValid
  );

  // Trusted origin AND password gate satisfied. The three exposed names below
  // share this one body; they stay distinct so call sites keep saying whether
  // they are guarding a mutation, a read, or a non-Fastify request object.
  const isFullyTrusted = (request: RequestLike) => {
    const decision = classify(request);
    return decision.trusted && decision.passwordGateSatisfied;
  };

  return {
    classifySocketSession(handshake) {
      const requestedClass = resolveRequestedSocketSessionClass(handshake.auth);
      if (requestedClass !== "management-trusted") {
        return "playback-safe";
      }

      if (
        matchesManagementAccessTokenHeader(handshake.headers, options.managementAccessToken)
        || matchesSocketAuthAccessToken(handshake.auth, options.managementAccessToken)
      ) {
        return "management-trusted";
      }

      return isFullyTrusted({ headers: handshake.headers, ip: handshake.address })
        ? "management-trusted"
        : "playback-safe";
    },
    createDeniedEnvelope() {
      return createManagementAccessDeniedEnvelope();
    },
    deny(reply) {
      return reply.status(403).send(createManagementAccessDeniedEnvelope());
    },
    isTrustedManagementOriginRequest(request) {
      return classify(request).trusted;
    },
    isTrustedManagementMutationRequest: isFullyTrusted,
    isTrustedManagementReadRequest: isFullyTrusted,
    isTrustedManagementRequestLike: isFullyTrusted
  };
}

export function createManagementCorsOriginDelegate(trustedOrigins: string[]) {
  return (origin: string | undefined, callback: (error: Error | null, allow: boolean) => void) => {
    callback(null, isTrustedManagementCorsOrigin(origin, trustedOrigins));
  };
}

export function createManagementCorsOptionsDelegate(trustedOrigins: string[]) {
  return (
    request: FastifyRequest,
    callback: (
      error: Error | null,
      corsOptions?: {
        credentials: boolean;
        methods: string[];
        origin: boolean;
      }
    ) => void
  ) => {
    const origin = isTrustedManagementCorsRequest(
      {
        headers: request.headers,
        ip: request.ip,
        method: request.method,
        url: request.url
      },
      trustedOrigins
    );

    callback(null, {
      // Without this the browser discards a credentialed cross-origin response,
      // so the management session cookie could never reach a trusted origin on
      // another host. The allowed origin set itself is unchanged.
      credentials: origin,
      methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
      origin
    });
  };
}

export function createManagementCorsRequestGate(trustedOrigins: string[]) {
  return (
    request: RequestLike,
    callback: (error: string | null | undefined, success: boolean) => void
  ) => {
    callback(null, isTrustedManagementCorsRequest(request, trustedOrigins));
  };
}

/**
 * The already-built access control is the only option. It carries the trusted
 * origins, the token, and the password gate hooks; letting the plugin build its
 * own would make it possible to register a gate-less instance by omission.
 */
type ManagementAuthPluginOptions = {
  accessControl: ManagementAccessControl;
};

const managementAuthPlugin: FastifyPluginAsync<ManagementAuthPluginOptions> = async (
  app,
  options
) => {
  const accessControl = options.accessControl;

  app.addHook("onRequest", async (request, reply) => {
    if (!isManagementMutationRequest(request)) {
      return;
    }

    if (accessControl.isTrustedManagementMutationRequest(request)) {
      return;
    }

    app.log.warn(
      {
        method: request.method,
        origin: readHeaderValue(request.headers.origin),
        remoteAddress: request.ip,
        url: request.url
      },
      "Denied management mutation request"
    );

    accessControl.deny(reply);
  });
};

export default managementAuthPlugin;
