import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { createManagementAccessControl } from "../plugins/managementAuth.js";
import mqttCapturesRoute from "./mqtt-captures.js";

test("capture metadata and lifecycle require management authorization and an explicit scope", async () => {
  const app = Fastify();
  app.decorate("managementAccess", createManagementAccessControl({
    managementAccessToken: "capture-test-token",
    trustedOrigins: []
  }));
  await app.register(mqttCapturesRoute);
  try {
    for (const url of ["/api/settings/mqtt/reception-profiles", "/api/settings/mqtt/captures/unknown/candidates"]) {
      const response = await app.inject({ method: "GET", url, remoteAddress: "198.51.100.2" });
      assert.equal(response.statusCode, 403);
    }
    const denied = await app.inject({ method: "DELETE", url: "/api/settings/mqtt/captures/unknown", remoteAddress: "198.51.100.2" });
    assert.equal(denied.statusCode, 403);
    const missingScope = await app.inject({
      method: "POST", url: "/api/settings/mqtt/captures", payload: {},
      headers: { "x-management-token": "capture-test-token" }
    });
    assert.equal(missingScope.statusCode, 400);
    assert.equal(missingScope.json().error, "INVALID_SCOPE");

    const profilesRes = await app.inject({
      method: "GET",
      url: "/api/settings/mqtt/reception-profiles",
      headers: { "x-management-token": "capture-test-token" }
    });
    assert.equal(profilesRes.statusCode, 200);
    const profiles = profilesRes.json().profiles;
    assert.equal(profiles.length, 6);
    const knEng = profiles.find((p: { id: string }) => p.id === "kn-engineering");
    assert.ok(knEng);
    assert.equal(knEng.kind, "engineering");
    assert.deepEqual(knEng.allowedFilters, ["factory/guanyin/"]);
  } finally {
    await app.close();
  }
});

test("DHR-R4-S01 interleaved tag payload creates separate candidates without collision", async () => {
  const { startCapture, tapCatalogObservation, listCandidates, stopCapture } = await import("../services/mqttObservationCatalogService.js");
  process.env.MQTT_OBSERVATION_CATALOG = "1";
  const session = startCapture({
    connectionRef: "test-conn",
    filter: "factory/cl/#",
    mode: "passive",
    receptionProfileId: "cl-power",
    siteScope: "cl"
  });

  tapCatalogObservation(
    session.captureId,
    { connectionRef: "test-conn", dup: null, exactTopic: "factory/cl/meters", origin: "catalog", qos: 1, receivedAt: "2026-09-16T00:00:01Z", retain: false, sourceTimestampEvidence: null },
    JSON.stringify({ tagId: "MAIN", value: 100 })
  );

  tapCatalogObservation(
    session.captureId,
    { connectionRef: "test-conn", dup: null, exactTopic: "factory/cl/meters", origin: "catalog", qos: 1, receivedAt: "2026-09-16T00:00:02Z", retain: false, sourceTimestampEvidence: null },
    JSON.stringify({ tagId: "STAMP", value: 200 })
  );

  tapCatalogObservation(
    session.captureId,
    { connectionRef: "test-conn", dup: null, exactTopic: "factory/cl/meters", origin: "catalog", qos: 1, receivedAt: "2026-09-16T00:00:03Z", retain: false, sourceTimestampEvidence: null },
    JSON.stringify({ tagId: "MAIN", value: 105 })
  );

  const list = listCandidates(session.captureId);
  assert.equal(list.candidates.length, 2);
  const mainCandidate = list.candidates.find((c) => c.declaredTag === "MAIN");
  const stampCandidate = list.candidates.find((c) => c.declaredTag === "STAMP");
  assert.ok(mainCandidate);
  assert.ok(stampCandidate);
  assert.equal(mainCandidate.sampleRefs.length, 2);
  assert.equal(stampCandidate.sampleRefs.length, 1);
  stopCapture(session.captureId);
});
