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
  url?: string;
};

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

function matchesHeaderAccessToken(
  headers: IncomingHttpHeaders,
  managementAccessToken: string | null
): boolean {
  if (!managementAccessToken) {
    return false;
  }

  return readHeaderValue(headers[MANAGEMENT_ACCESS_TOKEN_HEADER]) === managementAccessToken;
}

function matchesSocketAuthAccessToken(
  auth: Record<string, unknown> | undefined,
  managementAccessToken: string | null
) {
  if (!managementAccessToken) {
    return false;
  }

  const token = typeof auth?.managementAccessToken === "string" ? auth.managementAccessToken.trim() : "";
  return token.length > 0 && token === managementAccessToken;
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
  if (matchesHeaderAccessToken(request.headers, managementAccessToken)) {
    return {
      normalizedOrigin: null,
      reason: "access-token",
      trusted: true,
      passwordGateSatisfied: true
    };
  }

  const origin = readHeaderValue(request.headers.origin);

  if (!origin) {
    if (isSameHostReferer(request.headers, readHeaderValue(request.headers.host))) {
      return {
        normalizedOrigin: null,
        reason: "same-host-referer",
        trusted: true,
        passwordGateSatisfied: !passwordGateEnabled() || isManagementSessionValid(request)
      };
    }

    const trusted = isSameHostReferer(request.headers, readHeaderValue(request.headers.host)) || isLoopbackRemoteAddress(request.ip);
    return {
      normalizedOrigin: null,
      reason: trusted ? "loopback-remote" : "untrusted",
      trusted,
      passwordGateSatisfied: !passwordGateEnabled() || isManagementSessionValid(request)
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
      passwordGateSatisfied: !passwordGateEnabled() || isManagementSessionValid(request)
    };
  }

  if (matchesConfiguredOrigin(normalizedOrigin, trustedOrigins)) {
    return {
      normalizedOrigin,
      reason: "trusted-origin",
      trusted: true,
      passwordGateSatisfied: !passwordGateEnabled() || isManagementSessionValid(request)
    };
  }

  if (isSameHostOrigin(normalizedOrigin, readHeaderValue(request.headers.host))) {
    return {
      normalizedOrigin,
      reason: "same-host-origin",
      trusted: true,
      passwordGateSatisfied: !passwordGateEnabled() || isManagementSessionValid(request)
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
  const classify = (request: RequestLike) => classifyManagementRequest(request, options.trustedOrigins, options.managementAccessToken, passwordGateEnabled, isManagementSessionValid);
  return {
    classifySocketSession(handshake) {
      const requestedClass = resolveRequestedSocketSessionClass(handshake.auth);
      if (requestedClass !== "management-trusted") {
        return "playback-safe";
      }

      if (
        matchesHeaderAccessToken(handshake.headers, options.managementAccessToken)
        || matchesSocketAuthAccessToken(handshake.auth, options.managementAccessToken)
      ) {
        return "management-trusted";
      }

      return classifyManagementRequest(
        {
          headers: handshake.headers,
          ip: handshake.address
        },
        options.trustedOrigins,
        options.managementAccessToken,
        passwordGateEnabled,
        isManagementSessionValid
      ).trusted
        && classifyManagementRequest(
          { headers: handshake.headers, ip: handshake.address },
          options.trustedOrigins,
          options.managementAccessToken,
          passwordGateEnabled,
          isManagementSessionValid
        ).passwordGateSatisfied
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
    isTrustedManagementMutationRequest(request) {
      const decision = classify(request);
      return decision.trusted && decision.passwordGateSatisfied;
    },
    isTrustedManagementReadRequest(request) {
      const decision = classify(request);
      return decision.trusted && decision.passwordGateSatisfied;
    },
    isTrustedManagementRequestLike(request) {
      const decision = classify(request);
      return decision.trusted && decision.passwordGateSatisfied;
    }
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
        methods: string[];
        origin: boolean;
      }
    ) => void
  ) => {
    callback(null, {
      methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
      origin: isTrustedManagementCorsRequest(
        {
          headers: request.headers,
          ip: request.ip,
          method: request.method,
          url: request.url
        },
        trustedOrigins
      )
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

type ManagementAuthPluginOptions = {
  accessControl?: ManagementAccessControl;
  managementAccessToken: string | null;
  trustedOrigins: string[];
  passwordGateEnabled?: () => boolean;
  isManagementSessionValid?: (request: RequestLike) => boolean;
};

const managementAuthPlugin: FastifyPluginAsync<ManagementAuthPluginOptions> = async (
  app,
  options
) => {
  const accessControl =
    options.accessControl
    ?? createManagementAccessControl({
      managementAccessToken: options.managementAccessToken,
      trustedOrigins: options.trustedOrigins
    });

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
