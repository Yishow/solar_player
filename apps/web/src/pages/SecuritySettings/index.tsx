import { useEffect, useState } from "react";
import { PageScaffold } from "../shared/PageScaffold";
import { OpsInfoBanner, OpsSurface, OpsSurfaceTitle } from "../../components/management/opsSurfacePrimitives";
import { getManagementPasswordState, updateManagementPassword } from "../../services/api";
import { buildSecurityRequest, type SecurityForm } from "./viewModel";

export function SecuritySettings() {
  const [form, setForm] = useState<SecurityForm>({ enabled: false, newPassword: "", currentPassword: "" });
  const [gateCurrentlyEnabled, setGateCurrentlyEnabled] = useState(false);
  const [message, setMessage] = useState("正在讀取安全設定…");
  const [error, setError] = useState("");

  useEffect(() => {
    void getManagementPasswordState().then((state) => {
      setForm((current) => ({ ...current, enabled: state.enabled }));
      setGateCurrentlyEnabled(state.enabled);
      setMessage(state.enabled ? "密碼閘目前已開啟。" : "密碼閘目前未開啟。");
    }).catch(() => setError("無法讀取安全設定。"));
  }, []);

  const submit = async () => {
    const request = buildSecurityRequest(form, gateCurrentlyEnabled);
    if ("error" in request) { setError(request.error ?? "輸入資料不完整。"); return; }
    try {
      await updateManagementPassword(request);
      setError("");
      setMessage(form.enabled ? "密碼閘已更新，請重新解鎖管理頁。" : "密碼閘已關閉。");
      setForm((current) => ({ ...current, newPassword: "", currentPassword: "" }));
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "安全設定更新失敗。"); }
  };

  return <PageScaffold path="/settings/security" description="管理密碼與存取保護">
    <OpsSurface family="operations" className="mx-auto max-w-3xl space-y-6 p-8">
      <OpsSurfaceTitle title="安全設定" caption="Security" />
      <OpsInfoBanner title={message} tone={error ? "error" : "ready"} detail={error || "管理密碼只會由 server 驗證與保存。"} />
      <label className="flex min-h-12 items-center gap-3 text-base font-medium"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /> 開啟管理密碼閘</label>
      {form.enabled ? <label className="block">新密碼<input className="mt-2 min-h-12 w-full rounded-md border border-neutral-300 px-4" type="password" autoComplete="new-password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} /></label> : null}
      <label className="block">目前密碼（關閉或變更時需要）<input className="mt-2 min-h-12 w-full rounded-md border border-neutral-300 px-4" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} /></label>
      <button className="min-h-12 rounded-md bg-neutral-900 px-6 font-semibold text-white" type="button" onClick={() => void submit()}>儲存安全設定</button>
    </OpsSurface>
  </PageScaffold>;
}
