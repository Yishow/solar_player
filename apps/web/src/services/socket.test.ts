import assert from "node:assert/strict";
import test from "node:test";
import {
  emitClientHeartbeatViaClient,
  resolveSocketOriginFromLocation,
  resolveSocketOrigin,
  resolveSocketSessionClass
} from "./socket";

test("resolveSocketOrigin maps loopback Vite dev ports back to the backend port", () => {
  assert.equal(
    resolveSocketOrigin({
      hostname: "localhost",
      port: "5173",
      protocol: "http:"
    }),
    "http://localhost:3000"
  );
});

test("resolveSocketOrigin falls back to the backend origin when the HMR runtime marker is absent", () => {
  assert.equal(
    resolveSocketOrigin({
      hostname: "100.76.76.75",
      port: "5173",
      protocol: "http:"
    }),
    "http://100.76.76.75:3000"
  );
});

test("resolveSocketOrigin maps a configured custom non-loopback Vite dev port to the same origin", () => {
  assert.equal(
    resolveSocketOriginFromLocation({
      hostname: "100.76.76.75",
      port: "4173",
      protocol: "http:"
    }, "4173", true),
    "http://100.76.76.75:4173"
  );
});

test("resolveSocketOriginFromLocation sends preview traffic on Vite-like ports back to the backend origin", () => {
  assert.equal(
    resolveSocketOriginFromLocation({
      hostname: "100.76.76.75",
      port: "4173",
      protocol: "http:"
    }, "4173", false),
    "http://100.76.76.75:3000"
  );
});

test("resolveSocketSessionClass keeps playback routes public-safe and upgrades management routes explicitly", () => {
  assert.equal(resolveSocketSessionClass("/overview"), "playback-safe");
  assert.equal(resolveSocketSessionClass("/solar"), "playback-safe");
  assert.equal(resolveSocketSessionClass("/device-status"), "management-trusted");
  assert.equal(resolveSocketSessionClass("/settings/mqtt"), "management-trusted");
});

test("emitClientHeartbeatViaClient emits only when the socket client is connected", () => {
  let emittedEvent: string | null = null;
  let emittedPayload: unknown = null;
  let emitCount = 0;
  const payload = {
    clientTime: "2026-05-22T12:00:05.000Z",
    isIdle: false,
    isPlaying: true,
    pageKey: "overview",
    route: "/overview",
    sessionClass: "playback-safe" as const,
    viewport: {
      height: 1080,
      width: 1920
    }
  };

  assert.equal(
    emitClientHeartbeatViaClient(
      {
        connected: false,
        emit(event, body) {
          emittedEvent = event;
          emittedPayload = body;
          emitCount += 1;
        }
      },
      payload
    ),
    false
  );
  assert.equal(emitCount, 0);
  assert.equal(emittedEvent, null);
  assert.equal(emittedPayload, null);

  assert.equal(
    emitClientHeartbeatViaClient(
      {
        connected: true,
        emit(event, body) {
          emittedEvent = event;
          emittedPayload = body;
          emitCount += 1;
        }
      },
      payload
    ),
    true
  );
  assert.equal(emitCount, 1);
  assert.equal(emittedEvent, "client:heartbeat");
  assert.deepEqual(emittedPayload, payload);
});
