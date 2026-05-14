import assert from "node:assert/strict";
import test from "node:test";
import { slideshowCardOffsets, slideshowLayout } from "./layout";

test("slideshow preview layout centralizes title, status rail, carousel, and summary geometry", () => {
  assert.deepEqual(slideshowLayout.title, { left: 58, top: 8 });
  assert.deepEqual(slideshowLayout.status, { left: 50, top: 70, width: 282 });
  assert.deepEqual(slideshowLayout.controls, { height: 56, left: 50, top: 504, width: 282 });
  assert.deepEqual(slideshowLayout.carousel, {
    height: 460,
    left: 360,
    top: 78,
    width: 1500
  });
  assert.deepEqual(slideshowLayout.summary, {
    height: 212,
    left: 360,
    top: 580,
    width: 1500
  });
  assert.deepEqual(slideshowCardOffsets, [0, 280, 560, 880, 1160]);
});

test("slideshow preview keeps the left rail and right column free of vertical overlap", () => {
  // status (h ≈ 3 cards × 130 + 2 × 14 = 418) + controls must stack cleanly
  const statusBottomEstimate = slideshowLayout.status.top + 418;
  assert.ok(slideshowLayout.controls.top > statusBottomEstimate, "controls must clear status rail");

  // right column carousel + summary
  const carouselBottom = slideshowLayout.carousel.top + slideshowLayout.carousel.height;
  assert.ok(slideshowLayout.summary.top > carouselBottom, "summary must clear carousel");

  // total fits within 838
  const summaryBottom = slideshowLayout.summary.top + slideshowLayout.summary.height;
  const controlsBottom = slideshowLayout.controls.top + slideshowLayout.controls.height;
  assert.ok(summaryBottom <= 838, "summary fits content height 838");
  assert.ok(controlsBottom <= 838, "controls fit content height 838");
});
