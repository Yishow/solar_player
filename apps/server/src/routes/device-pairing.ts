import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { randomBytes } from "node:crypto";
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

function createPairingLandingPage(nonce: string) {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Solar Player 裝置配對</title>
</head>
<body>
  <main>
    <h1>Solar Player 裝置配對</h1>
    <p id="status">請貼上一次性 Pairing Token。</p>
    <form id="pairing-form">
      <label for="pairing-token">Pairing Token</label>
      <input id="pairing-token" name="token" type="password" autocomplete="off" required>
      <button type="submit">配對</button>
    </form>
  </main>
  <script nonce="${nonce}">
    const form = document.querySelector("#pairing-form");
    const input = document.querySelector("#pairing-token");
    const status = document.querySelector("#status");

    async function exchange(token) {
      history.replaceState(null, "", "/device-pairing");
      status.textContent = "配對中…";
      form.hidden = true;

      const response = await fetch("/api/device-pairing/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token })
      });

      if (response.status === 204) {
        window.location.replace("/overview");
        return;
      }

      let code = "pairing_failed";
      try {
        const body = await response.json();
        if (typeof body.code === "string") code = body.code;
      } catch {}
      status.textContent = "配對失敗：" + code;
      form.hidden = false;
    }

    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const fragmentToken = fragment.get("token");
    if (fragmentToken) void exchange(fragmentToken);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const token = input.value;
      input.value = "";
      void exchange(token);
    });
  </script>
</body>
</html>`;
}

const devicePairingRoute: FastifyPluginAsync = async (app) => {
  app.get("/device-pairing", async (_request, reply) => {
    const nonce = randomBytes(16).toString("base64");
    return reply
      .header("cache-control", "no-store")
      .header("referrer-policy", "no-referrer")
      .header("x-content-type-options", "nosniff")
      .header(
        "content-security-policy",
        `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; style-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`
      )
      .type("text/html; charset=utf-8")
      .send(createPairingLandingPage(nonce));
  });

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
