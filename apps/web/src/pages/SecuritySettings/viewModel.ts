export type SecurityForm = {
  enabled: boolean;
  newPassword: string;
  currentPassword: string;
};

export function buildSecurityRequest(form: SecurityForm, gateCurrentlyEnabled = false) {
  if (form.enabled && !form.newPassword.trim()) {
    return { error: "開啟密碼閘需要設定新密碼。" } as const;
  }
  if (form.enabled && gateCurrentlyEnabled && !form.currentPassword.trim()) {
    return { error: "變更密碼需要輸入目前密碼。" } as const;
  }
  if (form.enabled && form.currentPassword.trim()) {
    return { enabled: true, newPassword: form.newPassword, currentPassword: form.currentPassword } as const;
  }
  if (form.enabled) return { enabled: true, newPassword: form.newPassword } as const;
  if (!form.currentPassword.trim()) {
    return { error: "變更密碼需要輸入目前密碼。" } as const;
  }
  return { enabled: false, currentPassword: form.currentPassword } as const;
}
