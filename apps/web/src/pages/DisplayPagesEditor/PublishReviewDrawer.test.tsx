import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublishReviewDrawer } from "./PublishReviewDrawer";

test("U5-R1 review drawer requires a separate confirm and does not auto-publish", () => {
  const html = renderToStaticMarkup(
    <PublishReviewDrawer
      blockingCount={0}
      onClose={() => undefined}
      onConfirmPublish={() => undefined}
      publishingError=""
      publishingState={{
        fallback: {
          isFallbackActive: false,
          items: [],
          pageId: "overview",
          stage: "live"
        },
        validation: { canPublish: true, findings: [] }
      }}
    />
  );
  assert.match(html, /data-publish-review-drawer/);
  assert.match(html, /這是檢查結果，還沒發布/);
  assert.match(html, /data-publish-review-confirm/);
});
