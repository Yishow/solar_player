import assert from "node:assert/strict";
import test from "node:test";
import { buildSecurityRequest } from "./viewModel";

test("requires a new password when enabling", () => {
  assert.equal(buildSecurityRequest({ enabled: true, newPassword: "", currentPassword: "" }).error, "開啟密碼閘需要設定新密碼。");
});

test("requires the current password when changing password", () => {
  assert.equal(buildSecurityRequest({ enabled: true, newPassword: "new-password", currentPassword: "" }, true).error, "變更密碼需要輸入目前密碼。");
});

test("builds enable and disable payloads", () => {
  assert.deepEqual(buildSecurityRequest({ enabled: true, newPassword: "new-password", currentPassword: "" }, false), { enabled: true, newPassword: "new-password" });
  assert.deepEqual(buildSecurityRequest({ enabled: false, newPassword: "", currentPassword: "current" }), { enabled: false, currentPassword: "current" });
});
