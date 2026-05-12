import assert from "node:assert/strict";
import test from "node:test";
import { parse } from "./PayloadParser.js";

test("parse handles plain number payload", () => {
  assert.deepEqual(parse("586"), {
    raw: "586",
    value: 586
  });
});

test("parse handles quoted numeric payload", () => {
  assert.deepEqual(parse('"586"'), {
    raw: '"586"',
    value: 586
  });
});

test("parse handles object payload with quality", () => {
  assert.deepEqual(parse('{"value":586,"quality":"good"}'), {
    raw: '{"value":586,"quality":"good"}',
    quality: "good",
    value: 586
  });
});

test("parse handles nested value path", () => {
  assert.deepEqual(parse('{"data":{"power":586}}', "data.power"), {
    raw: '{"data":{"power":586}}',
    value: 586
  });
});
