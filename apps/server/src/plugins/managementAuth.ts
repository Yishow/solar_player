import type { FastifyPluginAsync, FastifyRequest } from "fastify";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const MANAGEMENT_ACCESS_TOKEN_HEADER = "x-solar-management-token";

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

function matchesAccessToken(
  request: FastifyRequest,
  managementAccessToken: string | null
): boolean {
  if (!managementAccessToken) {
    return false;
  }

  return readHeaderValue(request.headers[MANAGEMENT_ACCESS_TOKEN_HEADER]) === managementAccessToken;
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

function isTrustedManagementMutationRequest(
  request: FastifyRequest,
  trustedOrigins: string[],
  managementAccessToken: string | null
): boolean {
  if (matchesAccessToken(request, managementAccessToken)) {
    return true;
  }

  const origin = readHeaderValue(request.headers.origin);

  if (!origin) {
    return isLoopbackRemoteAddress(request.ip);
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

export function createManagementCorsOriginDelegate(trustedOrigins: string[]) {
  return (origin: string | undefined, callback: (error: Error | null, allow: boolean) => void) => {
    callback(null, isTrustedManagementCorsOrigin(origin, trustedOrigins));
  };
}

type ManagementAuthPluginOptions = {
  managementAccessToken: string | null;
  trustedOrigins: string[];
};

const managementAuthPlugin: FastifyPluginAsync<ManagementAuthPluginOptions> = async (
  app,
  options
) => {
  app.addHook("onRequest", async (request, reply) => {
    if (!isManagementMutationRequest(request)) {
      return;
    }

    if (
      isTrustedManagementMutationRequest(
        request,
        options.trustedOrigins,
        options.managementAccessToken
      )
    ) {
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

    reply.status(403).send({
      success: false,
      error: "Management access denied",
      timestamp: new Date().toISOString()
    });
  });
};

export default managementAuthPlugin;
