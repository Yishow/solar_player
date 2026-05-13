import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { routeMetaMap } from "../app/routeMeta";
import { PageScaffold } from "../pages/shared/PageScaffold";
import { ActionCluster } from "./ActionCluster";
import { MediaSlot } from "./MediaSlot";
import { PanelCard } from "./PanelCard";
import { StatusBadge } from "./StatusBadge";

test("shell witness routes declare the shared density contract", () => {
  assert.equal(routeMetaMap.get("/overview")?.shellDensity, "playback");
  assert.equal(routeMetaMap.get("/settings/playback")?.shellDensity, "management");
  assert.equal(routeMetaMap.get("/device-status")?.shellDensity, "device-detail");
});

test("page scaffold renders title block and page number through the shared shell contract", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      PageScaffold,
      {
        path: "/overview",
        description: "總覽儀表板"
      },
      React.createElement("div", null, "body")
    )
  );

  assert.match(html, /data-shell-density="playback"/);
  assert.match(html, /data-shell-primitive="title-block"/);
  assert.match(html, /data-shell-primitive="page-number-pill"/);
});

test("shell primitives expose reusable section, action, media, and status wrappers", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      PanelCard,
      {
        title: "系統資訊",
        subtitle: "SYSTEM"
      },
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          ActionCluster,
          null,
          React.createElement("button", { type: "button" }, "儲存")
        ),
        React.createElement(MediaSlot, null, React.createElement("img", { alt: "demo", src: "/demo.png" })),
        React.createElement(StatusBadge, {
          status: "connected",
          label: "MQTT Online"
        })
      )
    )
  );

  assert.match(html, /data-shell-primitive="section-wrapper"/);
  assert.match(html, /data-shell-primitive="action-cluster"/);
  assert.match(html, /data-shell-primitive="media-slot"/);
  assert.match(html, /data-shell-primitive="status-pill"/);
});
