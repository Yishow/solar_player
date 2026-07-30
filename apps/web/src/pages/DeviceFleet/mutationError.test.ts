import assert from "node:assert/strict";
import test from "node:test";
import { ApiRequestError } from "../../services/api";
import { formatDeviceFleetMutationError } from "./mutationError";

test("formatDeviceFleetMutationError maps actionable server codes", () => {
  const cases = [
    ["group_in_use", "仍有裝置使用"],
    ["client_id_conflict", "Client ID 已存在"],
    ["pairing_token_expired", "配對連結已過期"]
  ] as const;

  for (const [code, expected] of cases) {
    assert.match(
      formatDeviceFleetMutationError(
        new ApiRequestError("request failed", 409, { code })
      ),
      new RegExp(expected)
    );
  }
});
