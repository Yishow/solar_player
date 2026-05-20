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
  reason: "access-token" | "loopback-origin" | "loopback-remote" | "same-host-origin" | "trusted-origin" | "untrusted";
  trusted: boolean;
};

export type ManagementAccessControl = {
  classifySocketSession: (handshake: SocketHandshakeLike) => ManagementSocketSessionClass;
  createDeniedEnvelope: () => ManagementAccessDeniedEnvelope;
  deny: (reply: FastifyReply) => unknown;
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

function isSameHostOrigin(origin: string, requestHost: string | null): boolean {
  if (!requestHost) {
    return false;
  }

  try {
    return new URL(origin).host.toLowerCase() === requestHost.toLowerCase();
  } catch {
    return false;
  }
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
  return pathname.startsWith("/api/");
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

function classifyManagementRequest(
  request: RequestLike,
  trustedOrigins: string[],
  managementAccessToken: string | null
) : ManagementAccessDecision {
  if (matchesHeaderAccessToken(request.headers, managementAccessToken)) {
    return {
      normalizedOrigin: null,
      reason: "access-token",
      trusted: true
    };
  }

  const origin = readHeaderValue(request.headers.origin);

  if (!origin) {
    const trusted = isLoopbackRemoteAddress(request.ip);
    return {
      normalizedOrigin: null,
      reason: trusted ? "loopback-remote" : "untrusted",
      trusted
    };
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return {
      normalizedOrigin: null,
      reason: "untrusted",
      trusted: false
    };
  }

  if (isLoopbackOrigin(normalizedOrigin)) {
    return {
      normalizedOrigin,
      reason: "loopback-origin",
      trusted: true
    };
  }

  if (matchesConfiguredOrigin(normalizedOrigin, trustedOrigins)) {
    return {
      normalizedOrigin,
      reason: "trusted-origin",
      trusted: true
    };
  }

  if (isSameHostOrigin(normalizedOrigin, readHeaderValue(request.headers.host))) {
    return {
      normalizedOrigin,
      reason: "same-host-origin",
      trusted: true
    };
  }

  return {
    normalizedOrigin,
    reason: "untrusted",
    trusted: false
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
}): ManagementAccessControl {
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
        options.managementAccessToken
      ).trusted
        ? "management-trusted"
        : "playback-safe";
    },
    createDeniedEnvelope() {
      return createManagementAccessDeniedEnvelope();
    },
    deny(reply) {
      return reply.status(403).send(createManagementAccessDeniedEnvelope());
    },
    isTrustedManagementMutationRequest(request) {
      return classifyManagementRequest(
        request,
        options.trustedOrigins,
        options.managementAccessToken
      ).trusted;
    },
    isTrustedManagementReadRequest(request) {
      return classifyManagementRequest(
        request,
        options.trustedOrigins,
        options.managementAccessToken
      ).trusted;
    },
    isTrustedManagementRequestLike(request) {
      return classifyManagementRequest(
        request,
        options.trustedOrigins,
        options.managementAccessToken
      ).trusted;
    }
  };
}

export function createManagementCorsOriginDelegate(trustedOrigins: string[]) {
  return (origin: string | undefined, callback: (error: Error | null, allow: boolean) => void) => {
    callback(null, isTrustedManagementCorsOrigin(origin, trustedOrigins));
  };
}

type ManagementAuthPluginOptions = {
  accessControl?: ManagementAccessControl;
  managementAccessToken: string | null;
  trustedOrigins: string[];
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
