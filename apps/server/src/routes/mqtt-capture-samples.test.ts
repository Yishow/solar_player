import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { MQTT_CATALOG_LIMITS, type MqttTransportEvidence } from "@solar-display/shared";
import { createManagementAccessControl } from "../plugins/managementAuth.js";
import {
  listCandidates,
  setDiscoveryTransport,
  startCapture,
  stopCapture,
  tapCatalogObservation
} from "../services/mqttObservationCatalogService.js";
import mqttCapturesRoute from "./mqtt-captures.js";

const token = "capture-sample-token";
const headers = { "x-management-token": token };
const capturesUrl = "/api/settings/mqtt/captures";

type OpenedDiscovery = {
  closed: boolean;
  connectionRef: string;
  filter: string;
  publish: (evidence: Partial<MqttTransportEvidence> & { exactTopic: string }, payload: string) => void;
};

function fakeDiscoveryTransport(behaviour: { refuse?: boolean } = {}) {
  const opened: OpenedDiscovery[] = [];
  setDiscoveryTransport({
    async open({ connectionRef, filter, onMessage }) {
      if (behaviour.refuse) {
        throw Object.assign(new Error("SUBSCRIPTION_REFUSED"), { code: "SUBSCRIPTION_REFUSED" });
      }
      const entry: OpenedDiscovery = {
        closed: false,
        connectionRef,
        filter,
        publish: (evidence, payload) => onMessage({
          connectionRef, dup: false, origin: "mqtt", qos: 0,
          receivedAt: new Date().toISOString(), retain: false, sourceTimestampEvidence: null,
          ...evidence
        }, payload)
      };
      opened.push(entry);
      return { close: () => { entry.closed = true; } };
    }
  });
  return opened;
}

async function buildCaptureApp() {
  const app = Fastify();
  const production = { subscribe: [] as string[][], unsubscribe: [] as string[][] };
  app.decorate("managementAccess", createManagementAccessControl({
    managementAccessToken: token,
    trustedOrigins: []
  }));
  app.decorate("mqttClientService", {
    getActiveTopics: () => ["factory/kn/production"],
    getStatus: () => ({ broker: "synthetic:1883", clientId: "c", connected: true, reason: "connected", updatedAt: "" }),
    subscribe: async (topics: string[]) => { production.subscribe.push([...topics]); },
    unsubscribe: async (topics: string[]) => { production.unsubscribe.push([...topics]); }
  } as never);
  await app.register(mqttCapturesRoute);
  return { app, production };
}

test.beforeEach(() => {
  process.env.MQTT_OBSERVATION_CATALOG = "1";
  setDiscoveryTransport(null);
});

test("R3 an approved unmapped topic becomes discoverable through an isolated active capture", async () => {
  const opened = fakeDiscoveryTransport();
  const { app, production } = await buildCaptureApp();
  try {
    const started = await app.inject({
      headers, method: "POST", payload: {
        connectionRef: "central", filter: "factory/kn/unmapped", mode: "active",
        receptionProfileId: "kn-power", siteScope: "kn"
      }, url: capturesUrl
    });
    assert.equal(started.statusCode, 200, started.body);
    const session = started.json();
    assert.equal(session.discovery.state, "granted");
    assert.equal(session.coverage, "no-traffic", "a granted but silent subscription must not claim coverage");
    assert.equal(opened.length, 1, "active discovery must open its own short-lived subscription");
    assert.equal(opened[0]!.filter, "factory/kn/unmapped");
    assert.deepEqual(production.subscribe, [], "discovery must not touch production subscription ownership");
    assert.deepEqual(production.unsubscribe, []);

    opened[0]!.publish({ exactTopic: "factory/kn/unmapped" }, JSON.stringify({ tag: "P1", value: 12.5 }));
    const candidates = await app.inject({ headers, method: "GET", url: `${capturesUrl}/${session.captureId}/candidates` });
    assert.equal(candidates.statusCode, 200, candidates.body);
    const listed = candidates.json();
    assert.equal(listed.candidates.length, 1);
    assert.equal(listed.candidates[0].exactTopic, "factory/kn/unmapped");
    assert.equal(listed.candidates[0].sampleRefs.length, 1, "a candidate must carry a resolvable sample reference");

    const sampleId = listed.candidates[0].sampleRefs[0];
    const sample = await app.inject({ headers, method: "GET", url: `${capturesUrl}/${session.captureId}/samples/${sampleId}` });
    assert.equal(sample.statusCode, 200, sample.body);
    const evidence = sample.json();
    assert.equal(evidence.exactTopic, "factory/kn/unmapped");
    assert.equal(evidence.connectionRef, "central");
    assert.equal(evidence.siteScope, "kn");
    assert.equal(evidence.receptionProfileId, "kn-power");
    assert.equal(evidence.schemaVersion, 1);
    assert.deepEqual(JSON.parse(evidence.redactedPayload), { tag: "P1", value: 12.5 });
    assert.equal(evidence.transportEvidence.retain, false);
    assert.equal(evidence.transportEvidence.dup, false);
    assert.equal(evidence.transportEvidence.qos, 0);

    const stopped = await app.inject({ headers, method: "DELETE", url: `${capturesUrl}/${session.captureId}` });
    assert.equal(stopped.statusCode, 200, stopped.body);
    assert.equal(opened[0]!.closed, true, "stopping a capture must release its discovery subscription");
    assert.deepEqual(production.unsubscribe, [], "stopping a capture must never unsubscribe production");
  } finally {
    setDiscoveryTransport(null);
    await app.close();
  }
});

test("R3 sample evidence is redacted, bounded and expires with an explicit refresh state", async () => {
  const opened = fakeDiscoveryTransport();
  const { app } = await buildCaptureApp();
  try {
    const started = await app.inject({
      headers, method: "POST", payload: {
        connectionRef: "central", filter: "factory/kn/secretive", mode: "active",
        receptionProfileId: "kn-power", siteScope: "kn"
      }, url: capturesUrl
    });
    const session = started.json();
    opened[0]!.publish({ exactTopic: "factory/kn/secretive" }, JSON.stringify({ password: "hunter2", value: 1 }));
    const sampleId = listCandidates(session.captureId).candidates[0]!.sampleRefs[0]!;
    const sample = await app.inject({ headers, method: "GET", url: `${capturesUrl}/${session.captureId}/samples/${sampleId}` });
    assert.equal(sample.statusCode, 200, sample.body);
    assert.doesNotMatch(sample.json().redactedPayload, /hunter2/);

    const denied = await app.inject({
      method: "GET", remoteAddress: "198.51.100.2",
      url: `${capturesUrl}/${session.captureId}/samples/${sampleId}`
    });
    assert.equal(denied.statusCode, 403, "sample inspection must keep management authorization");

    stopCapture(session.captureId);
    const expired = await app.inject({ headers, method: "GET", url: `${capturesUrl}/${session.captureId}/samples/${sampleId}` });
    assert.equal(expired.statusCode, 404);
    assert.equal(expired.json().error, "CAPTURE_REFRESH_REQUIRED");
    assert.equal(expired.json().redactedPayload, undefined, "an expired sample must never return fabricated payload data");
  } finally {
    setDiscoveryTransport(null);
    await app.close();
  }
});

test("R3 an oversized sample is visibly limited instead of silently truncated", () => {
  const session = startCapture({
    connectionRef: "central", filter: "factory/kn/big", mode: "passive",
    receptionProfileId: "kn-power", siteScope: "kn"
  });
  const evidence: MqttTransportEvidence = {
    connectionRef: "central", dup: false, exactTopic: "factory/kn/big", origin: "mqtt",
    qos: 0, receivedAt: new Date().toISOString(), retain: false, sourceTimestampEvidence: null
  };
  const result = tapCatalogObservation(session.captureId, evidence, "x".repeat(MQTT_CATALOG_LIMITS.payloadBytes + 1));
  assert.equal(result.dropped, true);
  assert.equal(listCandidates(session.captureId).coverage, "partial");
  assert.equal(listCandidates(session.captureId).dropped, 1);
  stopCapture(session.captureId);
});

test("R3 discovery states stay distinguishable for refusal, unauthorized scope and a disabled feature", async () => {
  const { app } = await buildCaptureApp();
  try {
    fakeDiscoveryTransport({ refuse: true });
    const refused = await app.inject({
      headers, method: "POST", payload: {
        connectionRef: "central", filter: "factory/kn/refused", mode: "active",
        receptionProfileId: "kn-power", siteScope: "kn"
      }, url: capturesUrl
    });
    assert.equal(refused.statusCode, 200, refused.body);
    assert.equal(refused.json().discovery.state, "refused");
    assert.equal(refused.json().coverage, "subscription-refused");
    assert.equal(refused.json().discovery.reason, "SUBSCRIPTION_REFUSED");

    fakeDiscoveryTransport();
    const unauthorized = await app.inject({
      headers, method: "POST", payload: {
        connectionRef: "central", filter: "factory/cl/other", mode: "active",
        receptionProfileId: "kn-power", siteScope: "kn"
      }, url: capturesUrl
    });
    assert.equal(unauthorized.statusCode, 400, unauthorized.body);
    assert.equal(unauthorized.json().error, "SUBSCRIPTION_REFUSED");

    const wrongScope = await app.inject({
      headers, method: "POST", payload: {
        connectionRef: "central", filter: "factory/cl/", mode: "active",
        receptionProfileId: "cl-power", siteScope: "kn"
      }, url: capturesUrl
    });
    assert.equal(wrongScope.statusCode, 403);
    assert.equal(wrongScope.json().error, "UNAUTHORIZED_SCOPE");

    process.env.MQTT_OBSERVATION_CATALOG = "0";
    const disabled = await app.inject({
      headers, method: "POST", payload: {
        connectionRef: "central", filter: "factory/kn/", mode: "active",
        receptionProfileId: "kn-power", siteScope: "kn"
      }, url: capturesUrl
    });
    assert.equal(disabled.statusCode, 400);
    assert.equal(disabled.json().error, "SCOPE_NOT_CONFIGURED");
  } finally {
    process.env.MQTT_OBSERVATION_CATALOG = "1";
    setDiscoveryTransport(null);
    await app.close();
  }
});

test("R3 expiry and feature rollback release the discovery subscription without touching production", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const opened = fakeDiscoveryTransport();
  const { app, production } = await buildCaptureApp();
  try {
    const started = await app.inject({
      headers, method: "POST", payload: {
        connectionRef: "central", filter: "factory/kn/expiring", mode: "active",
        receptionProfileId: "kn-power", siteScope: "kn"
      }, url: capturesUrl
    });
    const session = started.json();
    t.mock.timers.tick((MQTT_CATALOG_LIMITS.sessionSeconds + 1) * 1000);
    const afterExpiry = await app.inject({ headers, method: "GET", url: `${capturesUrl}/${session.captureId}/candidates` });
    assert.equal(afterExpiry.statusCode, 404);
    assert.equal(opened[0]!.closed, true, "an expired capture must release its discovery subscription");
    assert.deepEqual(production.unsubscribe, []);
    assert.deepEqual(production.subscribe, []);
  } finally {
    setDiscoveryTransport(null);
    await app.close();
  }
});
