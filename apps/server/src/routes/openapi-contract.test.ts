import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-openapi-contract-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");
process.env.BRAND_UPLOADS_DIR = join(tempDir, "uploads", "brand");

const [{ buildApp }, { closeDatabaseConnection }, { migrateDatabase }, { seedDatabase }] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
]);

type AccessClass = "playback-safe" | "trusted-management-read" | "trusted-management-mutation";

type CriticalOperation = {
  path: string;
  method: "get" | "put" | "post";
  accessClass: AccessClass;
  /** Status codes the served operation must document. */
  responseCodes: string[];
};

/**
 * Locked critical inventory from design.md — keep in sync with docs/openapi.yaml.
 * Paths use OpenAPI parameter syntax (`{pageId}`), matching the served document.
 */
const CRITICAL_OPERATIONS: CriticalOperation[] = [
  { path: "/health", method: "get", accessClass: "playback-safe", responseCodes: ["200", "500"] },
  {
    path: "/api/playback/settings",
    method: "get",
    accessClass: "playback-safe",
    responseCodes: ["200", "500"]
  },
  {
    path: "/api/playback/settings",
    method: "put",
    accessClass: "trusted-management-mutation",
    responseCodes: ["200", "403", "500"]
  },
  {
    path: "/api/playback/pages",
    method: "get",
    accessClass: "playback-safe",
    responseCodes: ["200", "500"]
  },
  {
    path: "/api/playback/pages",
    method: "put",
    accessClass: "trusted-management-mutation",
    responseCodes: ["200", "403", "500"]
  },
  {
    path: "/api/playback/rotation-plan",
    method: "get",
    accessClass: "playback-safe",
    responseCodes: ["200", "500"]
  },
  {
    path: "/api/playback/rotation-plan",
    method: "put",
    accessClass: "trusted-management-mutation",
    responseCodes: ["200", "403", "500"]
  },
  {
    path: "/api/display-page-registry",
    method: "get",
    accessClass: "playback-safe",
    responseCodes: ["200", "500"]
  },
  {
    path: "/api/display-page-registry",
    method: "post",
    accessClass: "trusted-management-mutation",
    responseCodes: ["201", "400", "403", "500"]
  },
  {
    path: "/api/display-page-registry/{pageKey}",
    method: "put",
    accessClass: "trusted-management-mutation",
    responseCodes: ["200", "400", "403", "404", "500"]
  },
  {
    path: "/api/display-page-registry/{pageKey}/archive",
    method: "post",
    accessClass: "trusted-management-mutation",
    responseCodes: ["200", "400", "403", "404", "500"]
  },
  {
    path: "/api/display-pages/{pageId}/draft",
    method: "get",
    accessClass: "playback-safe",
    responseCodes: ["200", "404", "500"]
  },
  {
    path: "/api/display-pages/{pageId}/draft",
    method: "put",
    accessClass: "trusted-management-mutation",
    responseCodes: ["200", "400", "403", "404", "409", "500"]
  },
  {
    path: "/api/display-pages/{pageId}/live",
    method: "get",
    accessClass: "playback-safe",
    responseCodes: ["200", "404", "500"]
  },
  {
    path: "/api/display-pages/{pageId}/validate",
    method: "post",
    accessClass: "trusted-management-mutation",
    responseCodes: ["200", "403", "404", "500"]
  },
  {
    path: "/api/display-pages/{pageId}/publish",
    method: "post",
    accessClass: "trusted-management-mutation",
    responseCodes: ["200", "403", "404", "422", "500"]
  },
  {
    path: "/api/settings/mqtt",
    method: "get",
    accessClass: "trusted-management-read",
    responseCodes: ["200", "403", "500"]
  },
  {
    path: "/api/settings/mqtt",
    method: "put",
    accessClass: "trusted-management-mutation",
    responseCodes: ["200", "403", "500"]
  },
  {
    path: "/api/images",
    method: "get",
    accessClass: "playback-safe",
    responseCodes: ["200", "500"]
  },
  {
    path: "/api/images",
    method: "post",
    accessClass: "trusted-management-mutation",
    responseCodes: ["201", "400", "403", "500"]
  },
  {
    path: "/api/display-readiness",
    method: "get",
    accessClass: "trusted-management-read",
    responseCodes: ["200", "403", "500"]
  },
  {
    path: "/api/device/status",
    method: "get",
    accessClass: "trusted-management-read",
    responseCodes: ["200", "403", "500"]
  }
];

const ACCESS_CLASSES = new Set<AccessClass>([
  "playback-safe",
  "trusted-management-read",
  "trusted-management-mutation"
]);

const UNTRUSTED_HEADERS = {
  host: "player.example",
  origin: "https://evil.example"
} as const;

type OpenApiDocument = {
  info?: { description?: string; title?: string };
  paths?: Record<string, Record<string, Record<string, unknown>>>;
  components?: { schemas?: Record<string, SchemaObject> };
};

type SchemaObject = {
  $ref?: string;
  type?: string | string[];
  required?: string[];
  properties?: Record<string, SchemaObject>;
  const?: unknown;
  additionalProperties?: boolean | SchemaObject;
  items?: SchemaObject;
  nullable?: boolean;
};

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(process.env.DATABASE_PATH!, { force: true });
  rmSync(`${process.env.DATABASE_PATH!}-shm`, { force: true });
  rmSync(`${process.env.DATABASE_PATH!}-wal`, { force: true });
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
  delete process.env.DATA_DIR;
  delete process.env.DATABASE_PATH;
  delete process.env.UPLOADS_DIR;
  delete process.env.BRAND_UPLOADS_DIR;
});

function getOperation(spec: OpenApiDocument, path: string, method: string) {
  const pathItem = spec.paths?.[path];
  assert.ok(pathItem, `OpenAPI paths missing ${path}`);
  const operation = pathItem[method];
  assert.ok(operation, `OpenAPI missing ${method.toUpperCase()} ${path}`);
  return operation;
}

function resolveSchema(spec: OpenApiDocument, schema: SchemaObject | undefined): SchemaObject {
  if (!schema) {
    return {};
  }
  if (!schema.$ref) {
    return schema;
  }
  const match = schema.$ref.match(/^#\/components\/schemas\/(.+)$/);
  assert.ok(match, `Unsupported schema $ref: ${schema.$ref}`);
  const resolved = spec.components?.schemas?.[match[1]!];
  assert.ok(resolved, `Missing component schema ${match[1]}`);
  return resolveSchema(spec, resolved);
}

function responseSchema(
  spec: OpenApiDocument,
  operation: Record<string, unknown>,
  statusCode: string
): SchemaObject {
  const responses = operation.responses as Record<string, Record<string, unknown>> | undefined;
  assert.ok(responses?.[statusCode], `Operation missing response ${statusCode}`);
  const content = responses[statusCode]!.content as
    | Record<string, { schema?: SchemaObject }>
    | undefined;
  const schema = content?.["application/json"]?.schema;
  assert.ok(schema, `Response ${statusCode} missing application/json schema`);
  return resolveSchema(spec, schema);
}

function assertBodyMatchesSchema(
  body: unknown,
  schema: SchemaObject,
  label: string
) {
  assert.equal(typeof body, "object", `${label}: body must be an object`);
  assert.ok(body !== null && !Array.isArray(body), `${label}: body must be a plain object`);
  const record = body as Record<string, unknown>;
  for (const key of schema.required ?? []) {
    assert.ok(key in record, `${label}: missing required top-level key "${key}"`);
  }
  if (schema.properties) {
    for (const [key, propertySchema] of Object.entries(schema.properties)) {
      if (!(key in record)) {
        continue;
      }
      if (propertySchema.const !== undefined) {
        assert.equal(
          record[key],
          propertySchema.const,
          `${label}: property "${key}" const mismatch`
        );
      }
    }
  }
}

async function loadServedOpenApi() {
  migrateDatabase();
  seedDatabase();
  const app = await buildApp();
  try {
    const response = await app.inject({ method: "GET", url: "/docs/json" });
    assert.equal(response.statusCode, 200, `Expected /docs/json 200, got ${response.statusCode}`);
    const spec = response.json() as OpenApiDocument;
    return { app, spec };
  } catch (error) {
    await app.close();
    throw error;
  }
}

test("served OpenAPI declares critical coverage boundary (not full-site Phase 1 skeleton)", async () => {
  const { app, spec } = await loadServedOpenApi();
  try {
    const description = spec.info?.description ?? "";
    assert.match(description, /critical[- ]operation subset/i);
    assert.doesNotMatch(description, /Phase 1 skeleton/i);
    assert.doesNotMatch(description, /complete route coverage/i);

    for (const domain of [
      "playback",
      "display",
      "mqtt",
      "image",
      "readiness",
      "device"
    ]) {
      assert.match(
        description.toLowerCase(),
        new RegExp(domain),
        `info.description should identify covered domain mentioning "${domain}"`
      );
    }

    assert.match(description, /exclud/i, "info.description should list excluded domains");
  } finally {
    await app.close();
  }
});

test("critical operation inventory matches served OpenAPI paths, methods, access classes, and response codes", async () => {
  const { app, spec } = await loadServedOpenApi();
  try {
    for (const entry of CRITICAL_OPERATIONS) {
      const operation = getOperation(spec, entry.path, entry.method);
      const accessClass = operation["x-solar-access-class"];
      assert.equal(
        accessClass,
        entry.accessClass,
        `${entry.method.toUpperCase()} ${entry.path} access class`
      );
      assert.ok(
        ACCESS_CLASSES.has(accessClass as AccessClass),
        `${entry.method.toUpperCase()} ${entry.path} uses unknown access class ${String(accessClass)}`
      );

      const responses = operation.responses as Record<string, unknown> | undefined;
      for (const code of entry.responseCodes) {
        assert.ok(
          responses?.[code],
          `${entry.method.toUpperCase()} ${entry.path} missing response ${code}`
        );
      }
    }

    // Playback reads are playback-safe; MQTT mutation is trusted-management-mutation.
    assert.equal(
      getOperation(spec, "/api/playback/settings", "get")["x-solar-access-class"],
      "playback-safe"
    );
    assert.equal(
      getOperation(spec, "/api/settings/mqtt", "put")["x-solar-access-class"],
      "trusted-management-mutation"
    );

    // Draft conflict documents management_draft_conflict envelope shape.
    const draftPut = getOperation(spec, "/api/display-pages/{pageId}/draft", "put");
    const conflictSchema = responseSchema(spec, draftPut, "409");
    assert.deepEqual(
      new Set(conflictSchema.required ?? []),
      new Set(["code", "conflict", "error", "success", "timestamp"])
    );
    const conflictProps = conflictSchema.properties?.conflict;
    assert.ok(conflictProps, "409 schema must describe conflict object");
    const resolvedConflict = resolveSchema(spec, conflictProps);
    // latestEnvelope may be nested under properties or via required list
    const conflictRequired = new Set(resolvedConflict.required ?? []);
    for (const key of ["baseVersion", "currentVersion", "latestEnvelope", "resourceId", "resourceType"]) {
      assert.ok(conflictRequired.has(key), `409 conflict.required missing ${key}`);
    }
  } finally {
    await app.close();
  }
});

test("runtime examples remain executable against documented top-level shapes", async () => {
  migrateDatabase();
  seedDatabase();
  const app = await buildApp();

  try {
    const docsResponse = await app.inject({ method: "GET", url: "/docs/json" });
    assert.equal(docsResponse.statusCode, 200);
    const spec = docsResponse.json() as OpenApiDocument;

    // --- Domain: health ---
    {
      const health = await app.inject({ method: "GET", url: "/health" });
      assert.equal(health.statusCode, 200);
      assertBodyMatchesSchema(
        health.json(),
        responseSchema(spec, getOperation(spec, "/health", "get"), "200"),
        "GET /health 200"
      );
    }

    // --- Domain: playback ---
    {
      const settings = await app.inject({ method: "GET", url: "/api/playback/settings" });
      assert.equal(settings.statusCode, 200);
      assertBodyMatchesSchema(
        settings.json(),
        responseSchema(spec, getOperation(spec, "/api/playback/settings", "get"), "200"),
        "GET /api/playback/settings 200"
      );

      const denied = await app.inject({
        method: "PUT",
        url: "/api/playback/settings",
        headers: UNTRUSTED_HEADERS,
        payload: {}
      });
      assert.equal(denied.statusCode, 403);
      assertBodyMatchesSchema(
        denied.json(),
        responseSchema(spec, getOperation(spec, "/api/playback/settings", "put"), "403"),
        "PUT /api/playback/settings 403"
      );
    }

    // --- Domain: display publishing ---
    {
      const draftGet = await app.inject({ method: "GET", url: "/api/display-pages/overview/draft" });
      assert.equal(draftGet.statusCode, 200);
      assertBodyMatchesSchema(
        draftGet.json(),
        responseSchema(spec, getOperation(spec, "/api/display-pages/{pageId}/draft", "get"), "200"),
        "GET draft 200"
      );

      const firstSave = await app.inject({
        method: "PUT",
        url: "/api/display-pages/overview/draft",
        payload: { baseVersion: 1, regions: { heroCopyLayout: { left: 120 } } }
      });
      assert.equal(firstSave.statusCode, 200);
      assertBodyMatchesSchema(
        firstSave.json(),
        responseSchema(spec, getOperation(spec, "/api/display-pages/{pageId}/draft", "put"), "200"),
        "PUT draft 200"
      );

      const conflict = await app.inject({
        method: "PUT",
        url: "/api/display-pages/overview/draft",
        payload: { baseVersion: 1, regions: { heroCopyLayout: { left: 188 } } }
      });
      assert.equal(conflict.statusCode, 409);
      const conflictBody = conflict.json() as Record<string, unknown>;
      assertBodyMatchesSchema(
        conflictBody,
        responseSchema(spec, getOperation(spec, "/api/display-pages/{pageId}/draft", "put"), "409"),
        "PUT draft 409"
      );
      assert.equal(conflictBody.code, "management_draft_conflict");
      assert.equal(conflictBody.success, false);
      assert.ok(
        conflictBody.conflict && typeof conflictBody.conflict === "object",
        "409 conflict object present"
      );

      const validate = await app.inject({
        method: "POST",
        url: "/api/display-pages/overview/validate"
      });
      assert.equal(validate.statusCode, 200);
      assertBodyMatchesSchema(
        validate.json(),
        responseSchema(spec, getOperation(spec, "/api/display-pages/{pageId}/validate", "post"), "200"),
        "POST validate 200"
      );
    }

    // --- Domain: MQTT ---
    {
      const mqttOk = await app.inject({ method: "GET", url: "/api/settings/mqtt" });
      assert.equal(mqttOk.statusCode, 200);
      assertBodyMatchesSchema(
        mqttOk.json(),
        responseSchema(spec, getOperation(spec, "/api/settings/mqtt", "get"), "200"),
        "GET mqtt 200"
      );

      const mqttDenied = await app.inject({
        method: "GET",
        url: "/api/settings/mqtt",
        headers: UNTRUSTED_HEADERS
      });
      assert.equal(mqttDenied.statusCode, 403);
      assertBodyMatchesSchema(
        mqttDenied.json(),
        responseSchema(spec, getOperation(spec, "/api/settings/mqtt", "get"), "403"),
        "GET mqtt 403"
      );

      const mqttPutDenied = await app.inject({
        method: "PUT",
        url: "/api/settings/mqtt",
        headers: UNTRUSTED_HEADERS,
        payload: {}
      });
      assert.equal(mqttPutDenied.statusCode, 403);
      assertBodyMatchesSchema(
        mqttPutDenied.json(),
        responseSchema(spec, getOperation(spec, "/api/settings/mqtt", "put"), "403"),
        "PUT mqtt 403"
      );

      const mqttPut = await app.inject({
        method: "PUT",
        url: "/api/settings/mqtt",
        payload: { dataMode: "mock" }
      });
      assert.equal(mqttPut.statusCode, 200);
      assertBodyMatchesSchema(
        mqttPut.json(),
        responseSchema(spec, getOperation(spec, "/api/settings/mqtt", "put"), "200"),
        "PUT mqtt 200"
      );
    }

    // --- Domain: images ---
    {
      const list = await app.inject({ method: "GET", url: "/api/images" });
      assert.equal(list.statusCode, 200);
      assertBodyMatchesSchema(
        list.json(),
        responseSchema(spec, getOperation(spec, "/api/images", "get"), "200"),
        "GET images 200"
      );

      const missingFile = await app.inject({
        method: "POST",
        url: "/api/images",
        headers: { "content-type": "multipart/form-data; boundary=----openapi-contract" },
        payload: "------openapi-contract--\r\n"
      });
      assert.equal(missingFile.statusCode, 400);
      assertBodyMatchesSchema(
        missingFile.json(),
        responseSchema(spec, getOperation(spec, "/api/images", "post"), "400"),
        "POST images 400"
      );
    }

    // --- Domain: readiness + device ---
    {
      const readiness = await app.inject({ method: "GET", url: "/api/display-readiness" });
      assert.equal(readiness.statusCode, 200);
      assertBodyMatchesSchema(
        readiness.json(),
        responseSchema(spec, getOperation(spec, "/api/display-readiness", "get"), "200"),
        "GET readiness 200"
      );

      const readinessDenied = await app.inject({
        method: "GET",
        url: "/api/display-readiness",
        headers: UNTRUSTED_HEADERS
      });
      assert.equal(readinessDenied.statusCode, 403);
      assertBodyMatchesSchema(
        readinessDenied.json(),
        responseSchema(spec, getOperation(spec, "/api/display-readiness", "get"), "403"),
        "GET readiness 403"
      );

      const device = await app.inject({ method: "GET", url: "/api/device/status" });
      assert.equal(device.statusCode, 200);
      assertBodyMatchesSchema(
        device.json(),
        responseSchema(spec, getOperation(spec, "/api/device/status", "get"), "200"),
        "GET device/status 200"
      );

      const deviceDenied = await app.inject({
        method: "GET",
        url: "/api/device/status",
        headers: UNTRUSTED_HEADERS
      });
      assert.equal(deviceDenied.statusCode, 403);
      assertBodyMatchesSchema(
        deviceDenied.json(),
        responseSchema(spec, getOperation(spec, "/api/device/status", "get"), "403"),
        "GET device/status 403"
      );
    }

    // --- Registry list success ---
    {
      const registry = await app.inject({ method: "GET", url: "/api/display-page-registry" });
      assert.equal(registry.statusCode, 200);
      assertBodyMatchesSchema(
        registry.json(),
        responseSchema(spec, getOperation(spec, "/api/display-page-registry", "get"), "200"),
        "GET registry 200"
      );
    }
  } finally {
    await app.close();
  }
});
