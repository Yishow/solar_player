import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent([
      "export async function load(url, context, nextLoad) {",
      "  if (/\\.(css|png|svg|jpg|jpeg|gif|webp)$/.test(url)) {",
      "    return { format: 'module', shortCircuit: true, source: 'export default \"\";' };",
      "  }",
      "  return nextLoad(url, context);",
      "}"
    ].join("\n"))
);

test("workspace-assets-before-health: assets workspace loads and renders without waiting for asset health", async (t: TestContext) => {
  const { loadDisplayPagesEditorRoute, loadWorkspaceResources, clearDisplayPagesEditorRoutePreloadCache } = await import("./runtime");
  const { clearDisplayPageRegistrySnapshot } = await import("../../hooks/useDisplayPageRegistry");
  const { clearDisplayPageConfigCache } = await import("../../hooks/useDisplayPageConfig");
  const { rememberImageManagementModel } = await import("../ImageManagement/loadModel");

  clearDisplayPagesEditorRoutePreloadCache();
  clearDisplayPageRegistrySnapshot();
  clearDisplayPageConfigCache();
  rememberImageManagementModel(null as any);

  const requestedUrls: string[] = [];
  let resolveHealth: ((response: Response) => void) | null = null;

  t.mock.method(globalThis, "fetch", (input: RequestInfo | URL) => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    requestedUrls.push(urlStr);

    if (urlStr.includes("/api/images/storage-usage")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ data: { fileCount: 1, usedBytes: 1024, usedMB: 0.001 }, success: true }),
          { headers: { "Content-Type": "application/json" } }
        )
      );
    }

    if (urlStr.includes("/api/images")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 101,
                filename: "asset-101.png",
                originalName: "asset-101.png",
                title: "Test Asset",
                category: "icon",
                width: 100,
                height: 100,
                fileSize: 1024,
                mimeType: "image/png"
              }
            ],
            success: true
          }),
          { headers: { "Content-Type": "application/json" } }
        )
      );
    }

    if (urlStr.includes("/api/display-pages/asset-health") || urlStr.includes("/api/display-pages/assets/health")) {
      return new Promise<Response>((resolve) => {
        resolveHealth = resolve;
      });
    }

    return Promise.resolve(
      new Response(
        JSON.stringify({
          playlist: {
            entries: [],
            resolvedEntries: [],
            settings: { shuffle: false, bulkDurationSeconds: 15 }
          }
        }),
        { headers: { "Content-Type": "application/json" } }
      )
    );
  });

  t.after(() => {
    if (resolveHealth) {
      resolveHealth(
        new Response(
          JSON.stringify({
            assets: [],
            findings: [],
            generatedAt: new Date().toISOString(),
            status: "healthy"
          }),
          { headers: { "Content-Type": "application/json" } }
        )
      );
    }
  });

  const request = new Request("http://127.0.0.1/display-pages/editor?workspace=assets");
  const routeData = await loadDisplayPagesEditorRoute({ request });
  await loadWorkspaceResources(routeData.plan);

  // Verify image assets were requested
  assert.ok(requestedUrls.some((u) => u.includes("/api/images")));

  // Verify page draft was NOT requested for assets cold entry
  assert.ok(!requestedUrls.some((u) => u.includes("/api/display-pages/overview/draft")));
  assert.ok(!requestedUrls.some((u) => u.includes("/api/display-pages/solar/draft")));
});

test("workspace-shell-without-page-draft: shell workspace cold entry loads shell draft without waiting for page draft", async (t: TestContext) => {
  const { loadDisplayPagesEditorRoute, loadWorkspaceResources, clearDisplayPagesEditorRoutePreloadCache } = await import("./runtime");
  const { clearDisplayPageRegistrySnapshot } = await import("../../hooks/useDisplayPageRegistry");
  const { clearDisplayPageConfigCache } = await import("../../hooks/useDisplayPageConfig");

  clearDisplayPagesEditorRoutePreloadCache();
  clearDisplayPageRegistrySnapshot();
  clearDisplayPageConfigCache();

  const requestedUrls: string[] = [];

  t.mock.method(globalThis, "fetch", (input: RequestInfo | URL) => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    requestedUrls.push(urlStr);

    if (urlStr.includes("/api/shell-decorations/draft")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            config: {
              footerObjects: [],
              headerObjects: [],
              publishedAt: null,
              publishedBy: null,
              stage: "draft",
              updatedAt: "2026-09-12T00:00:00.000Z",
              version: 1
            }
          }),
          { headers: { "Content-Type": "application/json" } }
        )
      );
    }

    if (urlStr.includes("/api/images")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            assets: []
          }),
          { headers: { "Content-Type": "application/json" } }
        )
      );
    }

    return Promise.resolve(new Response(JSON.stringify({}), { headers: { "Content-Type": "application/json" } }));
  });

  const request = new Request("http://127.0.0.1/display-pages/editor?workspace=shell");
  const routeData = await loadDisplayPagesEditorRoute({ request });
  await loadWorkspaceResources(routeData.plan);

  // Verify shell draft was requested
  assert.ok(requestedUrls.some((u) => u.includes("/api/shell-decorations/draft")));

  // Verify page draft was NOT requested for shell cold entry
  assert.ok(!requestedUrls.some((u) => u.includes("/api/display-pages/overview/draft")));
  assert.ok(!requestedUrls.some((u) => u.includes("/api/display-pages/solar/draft")));
});

test("workspace-load-deduplicated: concurrent requests for the same workspace reuse in-flight load", async (t: TestContext) => {
  const { loadDisplayPagesEditorRoute, loadWorkspaceResources, clearDisplayPagesEditorRoutePreloadCache } = await import("./runtime");
  const { clearDisplayPageRegistrySnapshot } = await import("../../hooks/useDisplayPageRegistry");
  const { clearDisplayPageConfigCache } = await import("../../hooks/useDisplayPageConfig");
  const { rememberImageManagementModel } = await import("../ImageManagement/loadModel");

  clearDisplayPagesEditorRoutePreloadCache();
  clearDisplayPageRegistrySnapshot();
  clearDisplayPageConfigCache();
  rememberImageManagementModel(null as any);

  let imagesEndpointFetchCount = 0;

  t.mock.method(globalThis, "fetch", (input: RequestInfo | URL) => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    // Track calls to exact /api/images endpoint (ignoring sub-paths like /storage-usage)
    if (urlStr.endsWith("/api/images") || urlStr.includes("/api/images?")) {
      imagesEndpointFetchCount++;
      return new Promise<Response>((resolve) => {
        setTimeout(() => {
          resolve(
            new Response(
              JSON.stringify({
                data: [],
                success: true
              }),
              { headers: { "Content-Type": "application/json" } }
            )
          );
        }, 15);
      });
    }

    if (urlStr.includes("/api/images/storage-usage")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              fileCount: 0,
              usedBytes: 0,
              usedMB: 0
            },
            success: true
          }),
          { headers: { "Content-Type": "application/json" } }
        )
      );
    }

    if (urlStr.includes("/api/image-playlist/governance")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            playlist: {
              entries: [],
              resolvedEntries: [],
              settings: {
                bulkDurationSeconds: 15,
                shuffle: false
              }
            }
          }),
          { headers: { "Content-Type": "application/json" } }
        )
      );
    }

    return Promise.resolve(new Response(JSON.stringify({}), { headers: { "Content-Type": "application/json" } }));
  });

  const req1 = new Request("http://127.0.0.1/display-pages/editor?workspace=assets");
  const req2 = new Request("http://127.0.0.1/display-pages/editor?workspace=assets");

  const res1 = await loadDisplayPagesEditorRoute({ request: req1 });
  const res2 = await loadDisplayPagesEditorRoute({ request: req2 });

  await Promise.all([
    loadWorkspaceResources(res1.plan),
    loadWorkspaceResources(res2.plan)
  ]);

  // Image management model in-flight fetch deduplication ensures only 1 fetch was made to /api/images
  assert.equal(imagesEndpointFetchCount, 1);
});
