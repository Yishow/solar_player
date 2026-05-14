import assert from "node:assert/strict";
import test from "node:test";
import { slideshowCardOffsets, slideshowLayout } from "./layout";

test("slideshow preview layout centralizes title, status rail, carousel, and summary geometry", () => {
  assert.deepEqual(slideshowLayout.title, { left: 58, top: 8 });
  assert.deepEqual(slideshowLayout.status, { left: 50, top: 70, width: 282 });
  assert.deepEqual(slideshowLayout.carousel, {
    height: 460,
    left: 360,
    top: 78,
    width: 1500
  });
  assert.deepEqual(slideshowLayout.summary, {
    height: 212,
    left: 360,
    top: 558,
    width: 1500
  });
  assert.deepEqual(slideshowCardOffsets, [0, 300, 600, 900, 1200]);
});

test("slideshow preview right column carousel and summary do not overlap and fit 838px", () => {
  const carouselBottom = slideshowLayout.carousel.top + slideshowLayout.carousel.height;
  assert.ok(slideshowLayout.summary.top > carouselBottom, "summary must clear carousel");

  const summaryBottom = slideshowLayout.summary.top + slideshowLayout.summary.height;
  assert.ok(summaryBottom <= 838, "summary fits content height 838");
});
