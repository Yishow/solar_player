import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const requireFromWeb = createRequire(
  new URL("../apps/web/package.json", import.meta.url)
);
const { io } = requireFromWeb("socket.io-client");

const HEARTBEAT_INTERVAL_MS = 10_000;
const TIME_SIGNAL_INTERVAL_MS = 30_000;
// cl and kn. One unchanged Profile/Site cohort may evaluate the Effective
// Rotation once per revision, so a cohort-wide sweep may add at most this many.
const SITE_COHORT_COUNT = 2;
// The harness sends one "waiting" and one "applied" heartbeat per Client while
// exercising the published Profile Version rollout.
const ROLLOUT_LIFECYCLE_HEARTBEATS_PER_CLIENT = 2;

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : null;
  await new Promise((resolveClose) => server.close(resolveClose));
  if (!port) {
    throw new Error("unable to reserve an isolated Server port");
  }
  return port;
}

async function waitFor(check, {
  label,
  timeoutMs = 30_000
}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) {
      return;
    }
    await wait(50);
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function terminateChild(child) {
  if (child.exitCode !== null) {
    return;
  }
  const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
  child.kill("SIGTERM");
  await Promise.race([exited, wait(2_000)]);
  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([exited, wait(2_000)]);
  }
  if (child.exitCode === null) {
    throw new Error("isolated Server did not exit after SIGKILL");
  }
}

async function startIsolatedServer() {
  const tempDir = mkdtempSync(
    join(tmpdir(), "solar-device-scoped-playback-")
  );
  const port = await reservePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const output = [];
  const child = spawn(
    process.execPath,
    [
      resolve(repoRoot, "apps/server/node_modules/tsx/dist/cli.mjs"),
      resolve(repoRoot, "apps/server/src/server.ts")
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        DATA_DIR: tempDir,
        DATABASE_PATH: join(tempDir, "solar-display.sqlite"),
        HOST: "127.0.0.1",
        PHASE1_ACCEPTANCE_METRICS: "1",
        PORT: String(port),
        UPLOADS_DIR: join(tempDir, "uploads", "images")
      },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  const rememberOutput = (chunk) => {
    output.push(String(chunk));
    if (output.length > 40) {
      output.shift();
    }
  };
  child.stdout.on("data", rememberOutput);
  child.stderr.on("data", rememberOutput);

  try {
    await waitFor(async () => {
      if (child.exitCode !== null) {
        throw new Error(
          `isolated Server exited (${child.exitCode}): ${output.join("").slice(-2_000)}`
        );
      }
      try {
        return (await fetch(`${baseUrl}/health`)).ok;
      } catch {
        return false;
      }
    }, { label: "isolated Server readiness" });
  } catch (error) {
    try {
      await terminateChild(child);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
    throw error;
  }

  return {
    baseUrl,
    async close() {
      try {
        await terminateChild(child);
      } finally {
        rmSync(tempDir, { force: true, recursive: true });
      }
    }
  };
}

async function request(baseUrl, path, {
  body,
  cookie,
  expectedStatus = 200,
  headers,
  method = "GET"
} = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(cookie ? { cookie } : {}),
      ...headers
    },
    method
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (response.status !== expectedStatus) {
    const code = payload?.code ? ` (${payload.code})` : "";
    throw new Error(
      `${method} ${path} returned ${response.status}${code}; expected ${expectedStatus}`
    );
  }
  return { payload, response };
}

async function createGroup(baseUrl, siteScope) {
  const { payload } = await request(baseUrl, "/api/device-groups", {
    body: {
      enabled: true,
      name: `Phase 1 ${siteScope.toUpperCase()} cohort`,
      siteScope
    },
    expectedStatus: 201,
    method: "POST"
  });
  return payload.data.id;
}

async function pairDevice(baseUrl, deviceId) {
  const issued = await request(
    baseUrl,
    `/api/devices/${deviceId}/pairing-tokens`,
    { expectedStatus: 201, method: "POST" }
  );
  const exchanged = await request(baseUrl, "/api/device-pairing/exchange", {
    body: { token: issued.payload.data.token },
    expectedStatus: 204,
    method: "POST"
  });
  const setCookie = exchanged.response.headers.getSetCookie?.()[0]
    ?? exchanged.response.headers.get("set-cookie");
  const credentialCookie = setCookie?.split(";", 1)[0];
  if (!credentialCookie?.startsWith("solar_device_credential=")) {
    throw new Error(`Device ${deviceId} pairing did not return the credential Cookie`);
  }
  return credentialCookie;
}

async function createPairedDevice(baseUrl, {
  groupId,
  index,
  siteScope
}) {
  const created = await request(baseUrl, "/api/devices", {
    body: {
      clientId: `phase1-${siteScope}-${String(index).padStart(2, "0")}`,
      displayName: `Phase 1 ${siteScope.toUpperCase()} ${index}`,
      enabled: true,
      groupId
    },
    expectedStatus: 201,
    method: "POST"
  });
  const deviceId = created.payload.data.id;
  return {
    cookie: await pairDevice(baseUrl, deviceId),
    deviceId,
    groupId,
    siteScope
  };
}

async function assertPublicPlayback(baseUrl, device) {
  const pageId = device.siteScope === "cl"
    ? "factory-circuit"
    : "factory-circuit-guanyin";
  const forbiddenPageId = device.siteScope === "cl"
    ? "factory-circuit-guanyin"
    : "factory-circuit";
  const story = await request(baseUrl, `/api/display-story/${pageId}`, {
    cookie: device.cookie
  });
  if (story.payload.pageId !== pageId) {
    throw new Error(`Device ${device.deviceId} received the wrong Site Story`);
  }
  const forbiddenStory = await request(
    baseUrl,
    `/api/display-story/${forbiddenPageId}`,
    { cookie: device.cookie, expectedStatus: 403 }
  );
  if (forbiddenStory.payload.code !== "site_scope_mismatch") {
    throw new Error(
      `Device ${device.deviceId} wrong-Site Story did not fail closed`
    );
  }
  const conflictingSiteScope = device.siteScope === "cl" ? "kn" : "cl";
  const runtime = await request(
    baseUrl,
    `/api/playback/runtime?siteScope=${conflictingSiteScope}`,
    { cookie: device.cookie }
  );
  if (
    runtime.payload.context.deviceId !== device.deviceId
    || runtime.payload.context.groupId !== device.groupId
    || runtime.payload.context.siteScope !== device.siteScope
  ) {
    throw new Error(`Device ${device.deviceId} runtime context crossed identity or Site`);
  }
  const evaluationCount = Number(
    runtime.response.headers.get("x-solar-rotation-evaluations")
  );
  return {
    appliedVersion: runtime.payload.profileRollout?.appliedVersion ?? null,
    desiredVersion: runtime.payload.profileRollout?.desiredVersion ?? null,
    evaluationCount: Number.isInteger(evaluationCount) && evaluationCount > 0
      ? evaluationCount
      : null,
    profileId: runtime.payload.context.profileId,
    rotationKey:
      `${device.siteScope}:${runtime.payload.effectiveRotationRevision}`,
    settings: JSON.stringify(runtime.payload.settings)
  };
}

async function readLivenessSnapshot(baseUrl) {
  const status = await request(baseUrl, "/api/device/status");
  const clients = status.payload?.data?.displayClients?.clients;
  if (!Array.isArray(clients)) {
    throw new Error("display Client liveness metric unavailable");
  }
  return clients;
}

async function assertConnectedDevices(baseUrl, devices) {
  const liveness = await readLivenessSnapshot(baseUrl);
  for (const device of devices) {
    const client = liveness.find(
      (candidate) => candidate.deviceId === device.deviceId
    );
    if (!client || Number(client.connectedCount ?? 0) < 1) {
      throw new Error(
        `Device ${device.deviceId} lost its authenticated connection`
      );
    }
  }
}

async function countHeartbeatReadBack(baseUrl, devices) {
  const liveness = await readLivenessSnapshot(baseUrl);
  return devices.filter((device) => {
    const client = liveness.find(
      (candidate) => candidate.deviceId === device.deviceId
    );
    return (
      client?.timeSyncState === "synced"
      && client.pageKey === "overview"
      && client.route === "/overview"
    );
  }).length;
}

async function hasHeartbeatReadBack(baseUrl, devices) {
  return (await countHeartbeatReadBack(baseUrl, devices)) === devices.length;
}

function readRotationEvaluationHeader(response) {
  const value = response.headers.get("x-solar-rotation-evaluations");
  return value === null ? null : Number(value);
}

async function sweepRotationEvaluationCount(baseUrl, devices) {
  const counts = [];
  for (const device of devices) {
    const runtime = await request(baseUrl, "/api/playback/runtime", {
      cookie: device.cookie
    });
    counts.push(readRotationEvaluationHeader(runtime.response));
  }
  return counts.every((count) => count !== null)
    ? Math.max(...counts)
    : null;
}

async function assertHealthyIdentityState(baseUrl, devices) {
  const liveness = await readLivenessSnapshot(baseUrl);
  for (const device of devices) {
    const client = liveness.find(
      (candidate) => candidate.deviceId === device.deviceId
    );
    if (
      !client
      || client.duplicateIdentity !== false
      || client.sourceStatus !== "same-source"
    ) {
      throw new Error(
        `Device ${device.deviceId} reported a duplicate identity after reconnect`
      );
    }
  }
}

async function exerciseProfileSync(baseUrl, sockets, currentSettings) {
  const brightness = currentSettings.brightness === 73 ? 74 : 73;
  const receivedSettings = new Map();
  const handlers = sockets.map((socket, index) => {
    const handler = (payload) => {
      receivedSettings.set(index, JSON.stringify(payload?.settings));
    };
    socket.on("playback:settingsUpdated", handler);
    return handler;
  });
  try {
    const updated = await request(baseUrl, "/api/playback/settings", {
      body: { brightness },
      method: "PUT"
    });
    if (updated.payload.settings?.brightness !== brightness) {
      throw new Error("Playback Profile sync did not persist the new settings");
    }
    await waitFor(
      () => receivedSettings.size === sockets.length,
      { label: "Playback Profile sync on every Client", timeoutMs: 5_000 }
    );
    const expectedSettings = JSON.stringify(updated.payload.settings);
    const uniqueSettings = new Set(receivedSettings.values());
    if (
      uniqueSettings.size !== 1
      || !uniqueSettings.has(expectedSettings)
    ) {
      throw new Error("Playback Profile sync delivered inconsistent settings");
    }
  } finally {
    sockets.forEach((socket, index) => {
      socket.off("playback:settingsUpdated", handlers[index]);
    });
  }
}

async function publishChangedProfileVersion(baseUrl, profileId) {
  const draft = await request(
    baseUrl,
    `/api/playback-profiles/${profileId}/draft`
  );
  const saved = await request(
    baseUrl,
    `/api/playback-profiles/${profileId}/draft`,
    {
      body: {
        expectedRevision: draft.payload.data.revision,
        pages: draft.payload.data.pages,
        settings: {
          ...draft.payload.data.settings,
          brightness:
            draft.payload.data.settings.brightness === 71 ? 72 : 71,
          startPage: draft.payload.data.pages[0].id
        }
      },
      method: "PUT"
    }
  );
  const published = await request(
    baseUrl,
    `/api/playback-profiles/${profileId}/publish`,
    {
      body: { expectedRevision: saved.payload.data.revision },
      expectedStatus: 201,
      method: "POST"
    }
  );
  return published.payload.data.id;
}

async function prepareBrowserBoundaryProbe(baseUrl) {
  const plan = await request(baseUrl, "/api/playback/rotation-plan");
  const overview = plan.payload.rotationPlan.pages.find(
    (page) => page.pageKey === "overview"
  );
  if (!overview) {
    throw new Error("browser boundary probe could not find Overview");
  }
  await request(baseUrl, "/api/playback/rotation-plan", {
    body: {
      pages: plan.payload.rotationPlan.pages.map((page) => ({
        displayOrder: page.displayOrder,
        durationSeconds: page.id === overview.id ? 8 : page.durationSeconds,
        enabled: page.enabled,
        id: page.id
      }))
    },
    method: "PUT"
  });
  await request(baseUrl, "/api/playback/settings", {
    body: {
      autoplay: true,
      startPage: overview.id
    },
    method: "PUT"
  });
}

async function exerciseProductionBrowserRollout(baseUrl, device, profileId) {
  await prepareBrowserBoundaryProbe(baseUrl);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const [cookieName, cookieValue] = device.cookie.split("=", 2);
  await context.addCookies([{
    domain: "127.0.0.1",
    httpOnly: true,
    name: cookieName,
    path: "/",
    sameSite: "Lax",
    secure: false,
    value: cookieValue
  }]);
  const page = await context.newPage();
  let documentRequests = 0;
  let runtimeFetches = 0;
  let conditionalHits = 0;
  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentRequests += 1;
    }
  });
  page.on("response", (response) => {
    if (new URL(response.url()).pathname !== "/api/playback/runtime") {
      return;
    }
    runtimeFetches += 1;
    if (response.status() === 304) {
      conditionalHits += 1;
    }
  });

  try {
    await page.goto(`${baseUrl}/overview`, { waitUntil: "networkidle" });
    await waitFor(async () => {
      const clients = await readLivenessSnapshot(baseUrl);
      return clients.some(
        (client) => (
          client.deviceId === device.deviceId
          && client.route === "/overview"
        )
      );
    }, { label: "production browser rollout hydration", timeoutMs: 10_000 });

    const publishedAt = Date.now();
    const desiredVersion = await publishChangedProfileVersion(
      baseUrl,
      profileId
    );
    await waitFor(async () => {
      const clients = await readLivenessSnapshot(baseUrl);
      const client = clients.find(
        (candidate) => candidate.deviceId === device.deviceId
      );
      return (
        client?.desiredVersion === desiredVersion
        && client?.updateState === "waiting"
      );
    }, { label: "production browser waiting state", timeoutMs: 15_000 });
    let appliedAt = 0;
    await waitFor(async () => {
      const clients = await readLivenessSnapshot(baseUrl);
      const client = clients.find(
        (candidate) => candidate.deviceId === device.deviceId
      );
      if (
        client?.appliedVersion !== desiredVersion
        || client?.updateState !== "applied"
      ) {
        return false;
      }
      appliedAt = Date.now();
      return true;
    }, { label: "production browser applied state", timeoutMs: 20_000 });

    const boundaryWaitMs = appliedAt - publishedAt;
    if (boundaryWaitMs < 5_000) {
      throw new Error(
        `production browser applied before the safe boundary (${boundaryWaitMs}ms)`
      );
    }
    if (documentRequests !== 1) {
      throw new Error(
        `production browser performed ${documentRequests - 1} unexpected reloads`
      );
    }
    await waitFor(
      () => conditionalHits >= 1,
      { label: "production browser conditional runtime fetch", timeoutMs: 10_000 }
    );
    return {
      appliedOnServer: true,
      boundaryWaitMs,
      browserClients: 1,
      conditionalHits,
      desiredVersion,
      reloads: documentRequests - 1,
      runtimeFetches
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function exerciseVersionedProfileRollout(
  baseUrl,
  devices,
  sockets,
  runtimeEvidence
) {
  const desiredVersion = await publishChangedProfileVersion(
    baseUrl,
    runtimeEvidence[0].profileId
  );
  let conditionalHits = 0;
  const rotationEvaluationCounts = [];
  for (const device of devices) {
    const runtime = await request(baseUrl, "/api/playback/runtime", {
      cookie: device.cookie
    });
    rotationEvaluationCounts.push(readRotationEvaluationHeader(runtime.response));
    if (runtime.payload.profileRollout.desiredVersion !== desiredVersion) {
      throw new Error("published Profile Version did not reach every Device");
    }
    const etag = runtime.response.headers.get("etag");
    if (!etag) {
      throw new Error("playback runtime did not return an ETag");
    }
    await request(baseUrl, "/api/playback/runtime", {
      cookie: device.cookie,
      expectedStatus: 304,
      headers: { "if-none-match": etag }
    });
    conditionalHits += 1;
  }

  sockets.forEach((socket, index) => {
    socket.emit("client:heartbeat", {
      appliedVersion: runtimeEvidence[index].appliedVersion,
      desiredVersion,
      isPlaying: true,
      pageKey: "overview",
      route: "/overview",
      timeSyncState: "synced",
      updateError: null,
      updateState: "waiting"
    });
  });
  await waitFor(async () => {
    const clients = await readLivenessSnapshot(baseUrl);
    return devices.every((device) => {
      const client = clients.find(
        (candidate) => candidate.deviceId === device.deviceId
      );
      return (
        client?.desiredVersion === desiredVersion
        && client?.updateState === "waiting"
      );
    });
  }, { label: "waiting Profile rollout state", timeoutMs: 5_000 });

  sockets.forEach((socket) => {
    socket.emit("client:heartbeat", {
      appliedVersion: desiredVersion,
      desiredVersion,
      isPlaying: true,
      pageKey: "overview",
      route: "/overview",
      timeSyncState: "synced",
      updateError: null,
      updateState: "applied"
    });
  });
  await waitFor(async () => {
    const clients = await readLivenessSnapshot(baseUrl);
    return devices.every((device) => {
      const client = clients.find(
        (candidate) => candidate.deviceId === device.deviceId
      );
      return (
        client?.appliedVersion === desiredVersion
        && client?.updateState === "applied"
      );
    });
  }, { label: "applied Profile rollout state", timeoutMs: 5_000 });

  runtimeEvidence.forEach((evidence) => {
    evidence.appliedVersion = desiredVersion;
    evidence.desiredVersion = desiredVersion;
  });
  return {
    conditionalHits,
    heartbeats: devices.length * 2,
    rolloutApplied: devices.length,
    rolloutWaiting: devices.length,
    rotationEvaluations: rotationEvaluationCounts.every((count) => count !== null)
      ? Math.max(...rotationEvaluationCounts)
      : null,
    runtimeFetches: devices.length * 2
  };
}

async function exerciseIdentityLifecycle(
  baseUrl,
  devices,
  sockets
) {
  const unpaired = await request(baseUrl, "/api/display-story/overview", {
    expectedStatus: 401
  });
  if (unpaired.payload.code !== "device_unpaired") {
    throw new Error("unpaired playback did not fail closed");
  }

  const disabled = devices[0];
  await request(baseUrl, `/api/devices/${disabled.deviceId}`, {
    body: { enabled: false },
    method: "PUT"
  });
  const disabledRead = await request(baseUrl, "/api/display-story/overview", {
    cookie: disabled.cookie,
    expectedStatus: 403
  });
  if (disabledRead.payload.code !== "device_disabled") {
    throw new Error("disabled Device did not fail closed");
  }
  await assertConnectedDevices(baseUrl, devices.slice(1));
  await request(baseUrl, `/api/devices/${disabled.deviceId}`, {
    body: { enabled: true },
    method: "PUT"
  });

  const revoked = devices.at(-1);
  await request(
    baseUrl,
    `/api/devices/${revoked.deviceId}/credentials/revoke`,
    { method: "POST" }
  );
  const revokedRead = await request(baseUrl, "/api/playback/runtime", {
    cookie: revoked.cookie,
    expectedStatus: 403
  });
  if (revokedRead.payload.code !== "credential_revoked") {
    throw new Error("revoked credential did not fail closed");
  }
  const oldCookie = revoked.cookie;
  const revokedIndex = devices.length - 1;
  sockets[revokedIndex].disconnect();
  await waitFor(
    async () => (await readActiveConnections(baseUrl)) === devices.length - 1,
    { label: "revoked Device disconnect", timeoutMs: 5_000 }
  );
  await assertConnectedDevices(baseUrl, devices.slice(0, -1));

  revoked.cookie = await pairDevice(baseUrl, revoked.deviceId);
  if (revoked.cookie === oldCookie) {
    throw new Error("re-pair reused the revoked credential");
  }
  const oldCredentialAfterRepair = await request(
    baseUrl,
    "/api/playback/runtime",
    { cookie: oldCookie, expectedStatus: 403 }
  );
  if (oldCredentialAfterRepair.payload.code !== "credential_revoked") {
    throw new Error("old credential recovered after Device re-pair");
  }
  await assertPublicPlayback(baseUrl, revoked);
  return revokedIndex;
}

function connectDeviceSocket(baseUrl, device, onTimeSignal) {
  const socket = io(baseUrl, {
    autoConnect: false,
    extraHeaders: {
      cookie: device.cookie,
      origin: baseUrl
    },
    forceNew: true,
    reconnection: false,
    transports: ["websocket"]
  });
  socket.on("server:time", onTimeSignal);
  return new Promise((resolveConnect, reject) => {
    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`Device ${device.deviceId} Socket connection timed out`));
    }, 10_000);
    socket.once("connect", () => {
      clearTimeout(timeout);
      resolveConnect(socket);
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timeout);
      reject(
        new Error(`Device ${device.deviceId} Socket rejected: ${error.message}`)
      );
    });
    socket.connect();
  });
}

async function readActiveConnections(baseUrl) {
  return (await readLivenessSnapshot(baseUrl)).reduce(
    (total, client) => total + Number(client.connectedCount ?? 0),
    0
  );
}

export function evaluateAcceptanceThresholds(metrics) {
  const failures = [];
  const required = [
    "boundaryWaitMs",
    "browserClients",
    "browserConditionalHits",
    "clients",
    "conditionalHits",
    "durationMs",
    "heartbeatCoverage",
    "heartbeats",
    "reloads",
    "rolloutApplied",
    "rolloutWaiting",
    "runtimeFetches",
    "timeSignalCoverage",
    "timeSignals",
    "rotationEvaluations",
    "rotationEvaluationsAfterPublish",
    "rotationEvaluationsAtRest",
    "reconnects",
    "peakConnections"
  ];
  for (const field of required) {
    if (!Number.isFinite(metrics[field])) {
      failures.push(`${field} metric unavailable`);
    }
  }
  if (failures.length > 0) {
    return failures;
  }

  // Spec cadence bound: one immediate heartbeat plus at most one per interval.
  // On top of that the harness itself drives each Client through the
  // waiting -> applied Profile rollout, which costs two more heartbeats each.
  const heartbeatLimit =
    metrics.clients * (1 + Math.floor(metrics.durationMs / HEARTBEAT_INTERVAL_MS))
    + metrics.clients * ROLLOUT_LIFECYCLE_HEARTBEATS_PER_CLIENT;
  const timeSignalLimit =
    metrics.clients
    + metrics.reconnects
    + metrics.clients * Math.ceil(metrics.durationMs / TIME_SIGNAL_INTERVAL_MS);
  const timeSignalMinimum = metrics.clients + metrics.reconnects;
  if (metrics.heartbeats < metrics.clients) {
    failures.push(
      `heartbeats ${metrics.heartbeats} are below ${metrics.clients}`
    );
  }
  if (metrics.timeSignals < timeSignalMinimum) {
    failures.push(
      `timeSignals ${metrics.timeSignals} are below ${timeSignalMinimum}`
    );
  }
  if (metrics.rotationEvaluations < 2) {
    failures.push(
      `rotationEvaluations ${metrics.rotationEvaluations} are below 2`
    );
  }
  if (metrics.peakConnections < metrics.clients) {
    failures.push(
      `peakConnections ${metrics.peakConnections} are below ${metrics.clients}`
    );
  }
  if (metrics.timeSignalCoverage !== metrics.clients) {
    failures.push(
      `timeSignalCoverage ${metrics.timeSignalCoverage} does not equal ${metrics.clients}`
    );
  }
  if (metrics.heartbeatCoverage !== metrics.clients) {
    failures.push(
      `heartbeatCoverage ${metrics.heartbeatCoverage} does not equal ${metrics.clients}`
    );
  }
  if (metrics.conditionalHits !== metrics.clients) {
    failures.push(
      `conditionalHits ${metrics.conditionalHits} do not equal ${metrics.clients}`
    );
  }
  if (metrics.browserClients < 1 || metrics.browserConditionalHits < 1) {
    failures.push("production browser conditional-fetch evidence is unavailable");
  }
  if (metrics.boundaryWaitMs < 5_000) {
    failures.push(
      `boundaryWaitMs ${metrics.boundaryWaitMs} is below 5000`
    );
  }
  if (
    metrics.rolloutWaiting !== metrics.clients
    || metrics.rolloutApplied !== metrics.clients
  ) {
    failures.push(
      "waiting-to-applied Profile rollout did not cover every Client"
    );
  }
  if (metrics.reloads !== 0) {
    failures.push(`reloads ${metrics.reloads} exceed 0`);
  }
  if (metrics.runtimeFetches > metrics.clients * 3 + 10) {
    failures.push(
      `runtimeFetches ${metrics.runtimeFetches} exceed ${metrics.clients * 3 + 10}`
    );
  }
  if (metrics.heartbeats > heartbeatLimit) {
    failures.push(`heartbeats ${metrics.heartbeats} exceed ${heartbeatLimit}`);
  }
  if (metrics.timeSignals > timeSignalLimit) {
    failures.push(`timeSignals ${metrics.timeSignals} exceed ${timeSignalLimit}`);
  }
  if (metrics.rotationEvaluations > 2) {
    failures.push(`rotationEvaluations ${metrics.rotationEvaluations} exceed 2`);
  }
  if (metrics.peakConnections > metrics.clients) {
    failures.push(
      `peakConnections ${metrics.peakConnections} exceed ${metrics.clients}`
    );
  }
  const publishGrowth =
    metrics.rotationEvaluationsAfterPublish - metrics.rotationEvaluations;
  if (publishGrowth < 1) {
    failures.push(
      `rotation evaluations grew by ${publishGrowth} after publishing a Profile Version, below 1`
    );
  }
  if (publishGrowth > SITE_COHORT_COUNT) {
    failures.push(
      `rotation evaluations grew by ${publishGrowth} after publishing a Profile Version, exceeding ${SITE_COHORT_COUNT}`
    );
  }
  const steadyStateGrowth =
    metrics.rotationEvaluationsAtRest - metrics.rotationEvaluationsAfterPublish;
  if (steadyStateGrowth > SITE_COHORT_COUNT) {
    failures.push(
      `rotation evaluations grew by ${steadyStateGrowth} during the steady-state window, exceeding ${SITE_COHORT_COUNT}`
    );
  }
  return failures;
}

export async function runDeviceScopedPlaybackAcceptance({
  browserRolloutProbe = exerciseProductionBrowserRollout,
  clients = 50,
  durationMs = 600_000,
  reconnects = 5
} = {}) {
  if (!Number.isInteger(clients) || clients < 2 || clients % 2 !== 0) {
    throw new Error("clients must be an even integer of at least 2");
  }
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error("durationMs must be a non-negative number");
  }
  if (!Number.isInteger(reconnects) || reconnects < 1 || reconnects > clients) {
    throw new Error("reconnects must be an integer between 1 and clients");
  }

  const isolated = await startIsolatedServer();
  const sockets = [];
  let heartbeatTimer;
  let statusTimer;
  let heartbeats = 0;
  let timeSignals = 0;
  let peakConnections = 0;
  let statusPollError;

  try {
    const [clGroupId, knGroupId] = await Promise.all([
      createGroup(isolated.baseUrl, "cl"),
      createGroup(isolated.baseUrl, "kn")
    ]);
    const devices = [];
    for (let index = 0; index < clients; index += 1) {
      const siteScope = index < clients / 2 ? "cl" : "kn";
      devices.push(
        await createPairedDevice(isolated.baseUrl, {
          groupId: siteScope === "cl" ? clGroupId : knGroupId,
          index,
          siteScope
        })
      );
    }

    const runtimeEvidence = await Promise.all(
      devices.map((device) => assertPublicPlayback(isolated.baseUrl, device))
    );
    const rotationKeys = new Set(
      runtimeEvidence.map((evidence) => evidence.rotationKey)
    );
    const rotationEvaluationCounts = runtimeEvidence.map(
      (evidence) => evidence.evaluationCount
    );
    const profileIds = new Set(
      runtimeEvidence.map((evidence) => evidence.profileId)
    );
    const profileSettings = new Set(
      runtimeEvidence.map((evidence) => evidence.settings)
    );
    const rotationEvaluations = rotationEvaluationCounts.every(
      (count) => count !== null
    )
      ? Math.max(...rotationEvaluationCounts)
      : null;
    if (rotationKeys.size !== 2) {
      throw new Error(
        `expected two Profile/Site rotation cohorts; observed ${rotationKeys.size}`
      );
    }
    if (profileIds.size !== 1 || profileSettings.size !== 1) {
      throw new Error(
        "CL and KN cohorts did not share one Playback Profile and settings"
      );
    }
    const browserMetrics = await browserRolloutProbe(
      isolated.baseUrl,
      devices[0],
      runtimeEvidence[0].profileId
    );
    runtimeEvidence.forEach((evidence) => {
      evidence.desiredVersion = browserMetrics.desiredVersion;
    });
    if (browserMetrics.appliedOnServer) {
      runtimeEvidence[0].appliedVersion = browserMetrics.desiredVersion;
    }
    await waitFor(
      async () => (await readActiveConnections(isolated.baseUrl)) === 0,
      { label: "production browser disconnect", timeoutMs: 5_000 }
    );
    const timeSignalsByDevice = new Map();
    const trackTimeSignal = (device) => () => {
      timeSignals += 1;
      timeSignalsByDevice.set(
        device.deviceId,
        (timeSignalsByDevice.get(device.deviceId) ?? 0) + 1
      );
    };
    for (const device of devices) {
      sockets.push(
        await connectDeviceSocket(
          isolated.baseUrl,
          device,
          trackTimeSignal(device)
        )
      );
    }
    await waitFor(
      () => timeSignalsByDevice.size >= clients,
      { label: "immediate Server Time Signals for every Client", timeoutMs: 5_000 }
    );

    peakConnections = await readActiveConnections(isolated.baseUrl);
    statusTimer = setInterval(() => {
      void readActiveConnections(isolated.baseUrl)
        .then((active) => {
          peakConnections = Math.max(peakConnections, active);
        })
        .catch((error) => {
          statusPollError = error;
        });
    }, 1_000);
    const repairedIndex = await exerciseIdentityLifecycle(
      isolated.baseUrl,
      devices,
      sockets
    );
    const reconnectIndexes = [
      repairedIndex,
      ...devices
        .map((_device, index) => index)
        .filter((index) => index !== repairedIndex)
        .slice(0, reconnects - 1)
    ];
    for (const index of reconnectIndexes) {
      sockets[index].disconnect();
    }
    await waitFor(
      async () => (
        await readActiveConnections(isolated.baseUrl)
      ) === clients - reconnects,
      { label: `${reconnects} simultaneous Device disconnects`, timeoutMs: 5_000 }
    );
    const reconnectedSockets = await Promise.all(
      reconnectIndexes.map((index) => connectDeviceSocket(
        isolated.baseUrl,
        devices[index],
        trackTimeSignal(devices[index])
      ))
    );
    reconnectIndexes.forEach((index, position) => {
      sockets[index] = reconnectedSockets[position];
    });
    await waitFor(
      async () => (await readActiveConnections(isolated.baseUrl)) === clients,
      { label: "bounded connections after reconnect", timeoutMs: 5_000 }
    );

    const emitHeartbeats = () => {
      sockets.forEach((socket, index) => {
        const desiredVersion = runtimeEvidence[index]?.desiredVersion ?? null;
        const appliedVersion = runtimeEvidence[index]?.appliedVersion ?? null;
        socket.emit("client:heartbeat", {
          appliedVersion,
          desiredVersion,
          isPlaying: true,
          pageKey: "overview",
          route: "/overview",
          timeSyncState: "synced",
          updateError: null,
          updateState:
            desiredVersion !== null && appliedVersion === desiredVersion
              ? "applied"
              : "waiting"
        });
        heartbeats += 1;
      });
    };
    emitHeartbeats();
    await waitFor(
      () => hasHeartbeatReadBack(isolated.baseUrl, devices),
      { label: "Device/time heartbeat read-back", timeoutMs: 5_000 }
    );
    const rolloutMetrics = await exerciseVersionedProfileRollout(
      isolated.baseUrl,
      devices,
      sockets,
      runtimeEvidence
    );
    heartbeats += rolloutMetrics.heartbeats;
    heartbeatTimer = setInterval(emitHeartbeats, HEARTBEAT_INTERVAL_MS);
    await assertHealthyIdentityState(isolated.baseUrl, devices);
    peakConnections = Math.max(
      peakConnections,
      await readActiveConnections(isolated.baseUrl)
    );
    await exerciseProfileSync(
      isolated.baseUrl,
      sockets,
      JSON.parse(runtimeEvidence[0].settings)
    );

    await wait(durationMs);
    clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
    clearInterval(statusTimer);
    statusTimer = undefined;

    const heartbeatCoverage = await countHeartbeatReadBack(
      isolated.baseUrl,
      devices
    );
    const rotationEvaluationsAtRest = await sweepRotationEvaluationCount(
      isolated.baseUrl,
      devices
    );

    if (statusPollError) {
      throw statusPollError;
    }
    const settledConnections = await readActiveConnections(isolated.baseUrl);
    peakConnections = Math.max(peakConnections, settledConnections);
    const metrics = {
      boundaryWaitMs: browserMetrics.boundaryWaitMs,
      browserClients: browserMetrics.browserClients,
      browserConditionalHits: browserMetrics.conditionalHits,
      clients,
      conditionalHits: rolloutMetrics.conditionalHits,
      durationMs,
      heartbeats,
      peakConnections,
      reconnects,
      heartbeatCoverage,
      reloads: browserMetrics.reloads,
      rolloutApplied: rolloutMetrics.rolloutApplied,
      rolloutWaiting: rolloutMetrics.rolloutWaiting,
      rotationEvaluations,
      rotationEvaluationsAfterPublish: rolloutMetrics.rotationEvaluations,
      rotationEvaluationsAtRest,
      runtimeFetches:
        rolloutMetrics.runtimeFetches
        + browserMetrics.runtimeFetches
        + devices.length,
      timeSignalCoverage: timeSignalsByDevice.size,
      timeSignals
    };
    const failureDetails = evaluateAcceptanceThresholds(metrics);
    if (settledConnections !== clients) {
      failureDetails.push(
        `settled active connections ${settledConnections} do not equal ${clients}`
      );
    }
    return {
      ...metrics,
      failureDetails,
      failures: failureDetails.length
    };
  } finally {
    clearInterval(heartbeatTimer);
    clearInterval(statusTimer);
    for (const socket of sockets) {
      socket?.disconnect();
    }
    await isolated.close();
  }
}

async function main() {
  let result;
  try {
    if (process.argv.length > 2) {
      throw new Error(
        "acceptance command does not allow client, duration, or reconnect overrides"
      );
    }
    result = await runDeviceScopedPlaybackAcceptance();
  } catch (error) {
    result = {
      clients: 0,
      failureDetails: [error instanceof Error ? error.message : String(error)],
      failures: 1,
      heartbeats: 0,
      peakConnections: 0,
      reconnects: 0,
      rotationEvaluations: 0,
      timeSignals: 0
    };
  }
  console.log(JSON.stringify(result));
  process.exitCode = result.failures === 0 ? 0 : 1;
}

const entryFile = process.argv[1];
if (entryFile && import.meta.url === pathToFileURL(resolve(entryFile)).href) {
  await main();
}
