import assert from "node:assert/strict";
import test from "node:test";
import { mediaPlacementFields } from "./runtimeFieldBuilders";

test("media placement field builder exposes fit, focus, and align controls for editor regions", () => {
  const fields = mediaPlacementFields(
    "images-stage",
    ["mainStage"],
    {
      alt: "Stage image",
      src: "/images-stage.jpg"
    },
    () => {}
  );

  assert.deepEqual(
    fields.map((field) => field.id),
    [
      "images-stage-fit-mode",
      "images-stage-focus-x",
      "images-stage-focus-y",
      "images-stage-align-x",
      "images-stage-align-y"
    ]
  );
  assert.equal(fields[0]?.value, "cover");
  assert.equal(fields[1]?.value, 0.5);
});
