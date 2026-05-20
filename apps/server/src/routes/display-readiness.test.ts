import assert from "node:assert/strict";
import test from "node:test";
import {
  buildApp,
  getDatabase
} from "./display-pages-asset-governance.test-support.js";

test("GET /api/display-readiness reports blocking findings for missing MQTT mappings and slot bindings", async () => {
  const database = getDatabase();
  database.prepare("DELETE FROM topic_mappings WHERE metric_key = ?").run("realTimePower");
  database
    .prepare("UPDATE circuit_configs SET display_slot = NULL WHERE mqtt_topic = ?")
    .run("factory/power/production");

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-readiness"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      readiness: {
        findings: Array<{
          blocking: boolean;
          pageId: string;
          requirementKey: string;
          sourceType: string;
          status: string;
        }>;
        summary: {
          blockingCount: number;
        };
      };
    };

    assert.ok(body.readiness.summary.blockingCount >= 2);
    assert.equal(
      body.readiness.findings.some(
        (finding) =>
          finding.pageId === "overview" &&
          finding.requirementKey === "realTimePower" &&
          finding.sourceType === "mqtt-metric" &&
          finding.status === "blocking" &&
          finding.blocking
      ),
      true
    );
    assert.equal(
      body.readiness.findings.some(
        (finding) =>
          finding.pageId === "overview" &&
          finding.requirementKey === "todayCo2Reduction" &&
          finding.sourceType === "mqtt-metric"
      ),
      true
    );
    assert.equal(
      body.readiness.findings.some(
        (finding) =>
          finding.pageId === "overview" &&
          finding.requirementKey === "totalCo2Reduction" &&
          finding.sourceType === "mqtt-metric"
      ),
      true
    );
    assert.equal(
      body.readiness.findings.some(
        (finding) =>
          finding.pageId === "solar" &&
          finding.requirementKey === "selfConsumptionRatio" &&
          finding.sourceType === "derived-metric"
      ),
      true
    );
    assert.equal(
      body.readiness.findings.some(
        (finding) =>
          finding.pageId === "factory-circuit" &&
          finding.requirementKey === "factoryProductionPower" &&
          finding.sourceType === "mqtt-metric"
      ),
      true
    );
    assert.equal(
      body.readiness.findings.some(
        (finding) =>
          finding.pageId === "factory-circuit" &&
          finding.requirementKey === "production" &&
          finding.sourceType === "circuit-slot" &&
          finding.status === "blocking" &&
          finding.blocking
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("GET /api/display-readiness keeps solar self-consumption ready through derived dependencies", async () => {
  const database = getDatabase();
  database.prepare("DELETE FROM topic_mappings WHERE metric_key = ?").run("selfConsumptionRatio");

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-readiness"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      readiness: {
        findings: Array<{
          blocking: boolean;
          pageId: string;
          reason: string;
          requirementKey: string;
          sourceType: string;
          status: string;
        }>;
      };
    };

    assert.equal(
      body.readiness.findings.some(
        (finding) =>
          finding.pageId === "solar" &&
          finding.requirementKey === "selfConsumptionRatio" &&
          finding.sourceType === "derived-metric" &&
          finding.status === "ready" &&
          finding.blocking === false &&
          /derived from/i.test(finding.reason) &&
          /self_consumption/i.test(finding.reason) &&
          /consumption/i.test(finding.reason)
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("GET /api/display-readiness tracks rendered sustainability indicators instead of legacy placeholder dependencies", async () => {
  const database = getDatabase();
  database.prepare("DELETE FROM topic_mappings WHERE metric_key = ?").run("totalGeneration");
  database.prepare("DELETE FROM topic_mappings WHERE metric_key = ?").run("totalCo2Reduction");
  database.prepare("DELETE FROM topic_mappings WHERE metric_key = ?").run("selfConsumptionEnergy");

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-readiness"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      readiness: {
        findings: Array<{
          blocking: boolean;
          pageId: string;
          reason: string;
          requirementKey: string;
          sourceType: string;
          status: string;
        }>;
      };
    };

    assert.equal(
      body.readiness.findings.some(
        (finding) =>
          finding.pageId === "sustainability" &&
          finding.requirementKey === "accumulatedGenerationGwh" &&
          finding.sourceType === "derived-metric" &&
          finding.status === "blocking" &&
          /totalGeneration/i.test(finding.reason)
      ),
      true
    );
    assert.equal(
      body.readiness.findings.some(
        (finding) =>
          finding.pageId === "sustainability" &&
          finding.requirementKey === "annualEnergySavingPercent" &&
          finding.sourceType === "derived-metric" &&
          finding.status === "blocking" &&
          /selfConsumptionEnergy/i.test(finding.reason)
      ),
      true
    );
    assert.equal(
      body.readiness.findings.some(
        (finding) =>
          finding.pageId === "sustainability" &&
          finding.requirementKey === "consumptionEnergy"
      ),
      false
    );
  } finally {
    await app.close();
  }
});

test("GET /api/display-readiness reports factory metric mapping gaps alongside slot bindings", async () => {
  const database = getDatabase();
  database.prepare("DELETE FROM topic_mappings WHERE metric_key = ?").run("factoryProductionPower");

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-readiness"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      readiness: {
        findings: Array<{
          blocking: boolean;
          pageId: string;
          reason: string;
          requirementKey: string;
          sourceType: string;
          status: string;
        }>;
      };
    };

    assert.equal(
      body.readiness.findings.some(
        (finding) =>
          finding.pageId === "factory-circuit" &&
          finding.requirementKey === "factoryProductionPower" &&
          finding.sourceType === "mqtt-metric" &&
          finding.status === "blocking" &&
          finding.blocking &&
          /missing mqtt mapping/i.test(finding.reason)
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("GET /api/display-readiness reports conflicting slot assignments", async () => {
  const database = getDatabase();
  database
    .prepare("UPDATE circuit_configs SET display_slot = ? WHERE mqtt_topic IN (?, ?)")
    .run("production", "factory/power/production", "factory/power/hvac");

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-readiness"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      readiness: {
        findings: Array<{
          blocking: boolean;
          pageId: string;
          reason: string;
          requirementKey: string;
          sourceType: string;
          status: string;
        }>;
      };
    };

    assert.equal(
      body.readiness.findings.some(
        (finding) =>
          finding.pageId === "factory-circuit" &&
          finding.requirementKey === "production" &&
          finding.sourceType === "circuit-slot" &&
          finding.status === "blocking" &&
          finding.blocking &&
          /conflict/i.test(finding.reason)
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("MQTT and circuit settings surfaces expose the same blocking readiness findings", async () => {
  const database = getDatabase();
  database.prepare("DELETE FROM topic_mappings WHERE metric_key = ?").run("realTimePower");
  database
    .prepare("UPDATE circuit_configs SET display_slot = NULL WHERE mqtt_topic = ?")
    .run("factory/power/production");

  const app = await buildApp();

  try {
    const [mqttResponse, circuitsResponse] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/settings/mqtt"
      }),
      app.inject({
        method: "GET",
        url: "/api/circuits"
      })
    ]);

    assert.equal(mqttResponse.statusCode, 200);
    assert.equal(circuitsResponse.statusCode, 200);

    const mqttBody = mqttResponse.json() as {
      readiness: {
        findings: Array<{
          blocking: boolean;
          pageId: string;
          requirementKey: string;
          sourceType: string;
          status: string;
        }>;
        summary: {
          blockingCount: number;
        };
      };
    };
    const circuitsBody = circuitsResponse.json() as {
      readiness: {
        findings: Array<{
          blocking: boolean;
          pageId: string;
          requirementKey: string;
          sourceType: string;
          status: string;
        }>;
        summary: {
          blockingCount: number;
        };
      };
    };

    assert.equal(
      mqttBody.readiness.summary.blockingCount,
      circuitsBody.readiness.summary.blockingCount
    );

    const summarize = (
      findings: Array<{
        blocking: boolean;
        pageId: string;
        requirementKey: string;
        sourceType: string;
        status: string;
      }>
    ) =>
      findings
        .filter((finding) => finding.blocking)
        .map((finding) => `${finding.pageId}:${finding.requirementKey}:${finding.sourceType}:${finding.status}`)
        .sort();

    assert.deepEqual(
      summarize(mqttBody.readiness.findings),
      summarize(circuitsBody.readiness.findings)
    );
  } finally {
    await app.close();
  }
});

test("PUT /api/circuits/:id persists explicit display slot assignments", async () => {
  const app = await buildApp();

  try {
    const listResponse = await app.inject({
      method: "GET",
      url: "/api/circuits"
    });
    const firstCircuit = (listResponse.json() as {
      data: Array<{ displaySlot?: string | null; id: number }>;
    }).data[0];

    assert.ok(firstCircuit);

    const updateResponse = await app.inject({
      method: "PUT",
      payload: {
        displaySlot: "production"
      },
      url: `/api/circuits/${firstCircuit.id}`
    });

    assert.equal(updateResponse.statusCode, 200);
    const body = updateResponse.json() as {
      data: {
        displaySlot: string | null;
      };
      success: boolean;
    };

    assert.equal(body.success, true);
    assert.equal(body.data.displaySlot, "production");
  } finally {
    await app.close();
  }
});
