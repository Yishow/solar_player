import { ApiRequestError } from "../../services/api";

export function formatDeviceFleetMutationError(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.body?.code === "group_in_use") {
      return "此群組仍有裝置使用，請先移動或停用相關裝置。";
    }
    if (error.body?.code === "client_id_conflict") {
      return "Client ID 已存在，請使用另一個穩定識別碼。";
    }
    if (error.body?.code === "pairing_token_expired") {
      return "配對連結已過期，請重新簽發一次性配對連結。";
    }
    if (
      error.body?.code === "pairing_token_invalid"
      || error.body?.code === "pairing_token_used"
    ) {
      return "配對連結已失效，請重新簽發一次性配對連結。";
    }
    if (error.body?.code === "management_access_denied") {
      return "管理權限已失效，請回到受信任的管理入口重新驗證。";
    }
  }
  return error instanceof Error ? error.message : "操作失敗，請稍後再試。";
}
