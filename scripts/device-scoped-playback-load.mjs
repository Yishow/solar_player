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
  method = "GET"
} = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(cookie ? { cookie } : {})
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

async function hasHeartbeatReadBack(baseUrl, devices) {
  const liveness = await readLivenessSnapshot(baseUrl);
  return devices.every((device) => {
    const client = liveness.find(
      (candidate) => candidate.deviceId === device.deviceId
    );
    return (
      client?.timeSyncState === "synced"
      && client.pageKey === "overview"
      && client.route === "/overview"
    );
  });
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
    "clients",
    "durationMs",
    "heartbeats",
    "timeSignals",
    "rotationEvaluations",
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

  const heartbeatLimit =
    metrics.clients * (1 + Math.floor(metrics.durationMs / HEARTBEAT_INTERVAL_MS));
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
  return failures;
}

export async function runDeviceScopedPlaybackAcceptance({
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
    const onTimeSignal = () => {
      timeSignals += 1;
    };
    for (const device of devices) {
      sockets.push(
        await connectDeviceSocket(isolated.baseUrl, device, onTimeSignal)
      );
    }
    await waitFor(
      () => timeSignals >= clients,
      { label: "immediate Server Time Signals", timeoutMs: 5_000 }
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
        onTimeSignal
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
      for (const socket of sockets) {
        socket.emit("client:heartbeat", {
          isPlaying: true,
          pageKey: "overview",
          route: "/overview",
          timeSyncState: "synced"
        });
        heartbeats += 1;
      }
    };
    emitHeartbeats();
    heartbeatTimer = setInterval(emitHeartbeats, HEARTBEAT_INTERVAL_MS);
    await waitFor(
      () => hasHeartbeatReadBack(isolated.baseUrl, devices),
      { label: "Device/time heartbeat read-back", timeoutMs: 5_000 }
    );
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

    if (statusPollError) {
      throw statusPollError;
    }
    const settledConnections = await readActiveConnections(isolated.baseUrl);
    peakConnections = Math.max(peakConnections, settledConnections);
    const metrics = {
      clients,
      durationMs,
      heartbeats,
      peakConnections,
      reconnects,
      rotationEvaluations,
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
