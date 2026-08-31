import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DataHubSectionState } from "./sectionState";

test("Data Hub section state renders bounded loading error and empty feedback", () => {
  const loading = renderToStaticMarkup(<DataHubSectionState status="loading" />);
  const error = renderToStaticMarkup(<DataHubSectionState message="Metrics failed" status="error" />);
  const empty = renderToStaticMarkup(<DataHubSectionState message="No metrics" status="empty" />);

  assert.match(loading, /role="status"/);
  assert.match(error, /role="alert"/);
  assert.match(error, /Metrics failed/);
  assert.match(empty, /No metrics/);
});

test("Data Hub section state renders ready content without a fallback message", () => {
  const html = renderToStaticMarkup(
    <DataHubSectionState status="ready"><span>Scoped metrics</span></DataHubSectionState>
  );

  assert.match(html, /Scoped metrics/);
  assert.doesNotMatch(html, /role="status"|role="alert"/);
});
