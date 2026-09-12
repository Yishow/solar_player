import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { ManagementRouteState } from "./ManagementRouteState";

test("ManagementRouteState renders pending state with accessible status", () => {
  const rendered = ManagementRouteState({
    status: "pending",
    title: "測試載入中",
    message: "請稍候"
  });

  assert.equal(rendered.props["data-route-state"], "pending");
  assert.equal(rendered.props["data-testid"], "management-route-pending");

  const children = React.Children.toArray(rendered.props.children);
  const container = children[0] as React.ReactElement<{ children?: React.ReactNode }>;
  const subChildren = React.Children.toArray(container.props.children);

  const titleEl = subChildren.find(
    (c): c is React.ReactElement<{ children?: React.ReactNode }> =>
      React.isValidElement(c) && c.type === "h2"
  );
  assert.equal(titleEl?.props.children, "測試載入中");

  const retryButton = subChildren.find(
    (c): c is React.ReactElement<{ "data-testid"?: string; children?: React.ReactNode }> =>
      React.isValidElement(c) && (c.props as any)["data-testid"] === "management-route-retry-button"
  );
  assert.equal(retryButton, undefined);
});

test("ManagementRouteState renders error state with retry button and triggers onRetry", () => {
  let retried = false;
  const rendered = ManagementRouteState({
    status: "error",
    title: "載入失敗",
    message: "網路異常",
    onRetry: () => {
      retried = true;
    }
  });

  assert.equal(rendered.props["data-route-state"], "error");
  const children = React.Children.toArray(rendered.props.children);
  const container = children[0] as React.ReactElement<{ children?: React.ReactNode }>;
  const subChildren = React.Children.toArray(container.props.children);

  const retryButton = subChildren.find(
    (c): c is React.ReactElement<{ "data-testid"?: string; children?: React.ReactNode; onClick?: () => void }> =>
      React.isValidElement(c) && (c.props as any)["data-testid"] === "management-route-retry-button"
  );
  assert.ok(retryButton);
  assert.equal(retryButton.props.children, "重新載入");

  retryButton.props.onClick?.();
  assert.equal(retried, true);
});
