import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  checkDevicePairingStatus,
  exchangePairingToken,
  extractAndClearFragmentToken,
  initialDevicePairingState,
  type DevicePairingState,
  type DevicePairingStatus
} from "./viewModel";

export type DevicePairingViewProps = {
  clientId?: string | null;
  deviceId?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  onExchange: (token: string) => Promise<void>;
  onRetry: () => void;
  status: DevicePairingStatus;
};

export function DevicePairingView({
  clientId,
  errorCode: _errorCode,
  errorMessage,
  onExchange,
  onRetry,
  status
}: DevicePairingViewProps) {
  const [tokenInput, setTokenInput] = useState("");
  const isSubmitting = status === "exchanging";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanToken = tokenInput.trim();
    if (!cleanToken || isSubmitting) {
      return;
    }
    await onExchange(cleanToken);
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-neutral-950 px-6 py-12 text-neutral-100 selection:bg-amber-500 selection:text-neutral-950">
      {/* Background ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent blur-3xl" />
      </div>

      <main className="relative z-10 w-full max-w-lg rounded-2xl border border-neutral-800/80 bg-neutral-900/90 p-8 shadow-2xl backdrop-blur-md sm:p-10">
        {/* Brand Header */}
        <header className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-neutral-950 shadow-lg shadow-amber-500/20">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" x2="12" y1="1" y2="3" />
              <line x1="12" x2="12" y1="21" y2="23" />
              <line x1="4.22" x2="5.64" y1="4.22" y2="5.64" />
              <line x1="18.36" x2="19.78" y1="18.36" y2="19.78" />
              <line x1="1" x2="3" y1="12" y2="12" />
              <line x1="21" x2="23" y1="12" y2="12" />
              <line x1="4.22" x2="5.64" y1="19.78" y2="18.36" />
              <line x1="18.36" x2="19.78" y1="5.64" y2="4.22" />
            </svg>
          </div>
          <p className="mt-4 text-xs font-semibold tracking-widest text-amber-500 uppercase">
            Solar Player
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            裝置配對
          </h1>
        </header>

        {/* Dynamic Content based on State Machine */}
        <div className="mt-8">
          {status === "checking" && (
            <div className="flex flex-col items-center justify-center py-8 text-neutral-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <p className="mt-4 text-sm font-medium">正在檢查配對狀態…</p>
            </div>
          )}

          {status === "already_paired" && (
            <div className="space-y-6 text-center">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 p-4 text-emerald-400">
                <p className="text-base font-semibold">此裝置已完成配對</p>
                {clientId && (
                  <p className="mt-1 font-mono text-sm text-emerald-200">
                    裝置識別碼：{clientId}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-amber-500 px-5 text-base font-semibold text-neutral-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-neutral-900"
                  href="/overview"
                >
                  前往播放總覽
                </a>
                <button
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800/80 px-5 text-base font-medium text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
                  onClick={onRetry}
                  type="button"
                >
                  更換配對
                </button>
              </div>
            </div>
          )}

          {status === "exchanging" && (
            <div className="flex flex-col items-center justify-center py-8 text-neutral-300">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
              <p className="mt-4 text-base font-medium">正在驗證裝置憑證，請稍候…</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <svg
                  aria-hidden="true"
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-emerald-400">配對成功！</h2>
              <p className="text-sm text-neutral-400">即將自動導向播放總覽…</p>
            </div>
          )}

          {(status === "idle" || status === "error") && (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {errorMessage && (
                <div
                  className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-300"
                  role="alert"
                >
                  {errorMessage}
                </div>
              )}

              <div>
                <label
                  className="block text-sm font-medium text-neutral-300"
                  htmlFor="pairing-token-input"
                >
                  Pairing Token（一次性配對金鑰）
                </label>
                <div className="relative mt-2">
                  <input
                    autoComplete="off"
                    autoFocus
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-950/80 px-4 py-3.5 font-mono text-base text-white placeholder-neutral-500 transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                    disabled={isSubmitting}
                    id="pairing-token-input"
                    name="token"
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="貼上或輸入 15 分鐘一次性 Token"
                    required
                    type="password"
                    value={tokenInput}
                  />
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  說明：無需輸入管理密碼。請在管理後台「裝置與群組」發行 Token 後貼入。
                </p>
              </div>

              <button
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-500 px-5 text-base font-semibold text-neutral-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting || !tokenInput.trim()}
                type="submit"
              >
                {status === "error" ? "重新配對" : "開始配對"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export function DevicePairing() {
  const navigate = useNavigate();
  const [state, setState] = useState<DevicePairingState>(initialDevicePairingState);

  const performExchange = async (token: string) => {
    setState((prev) => ({
      ...prev,
      errorCode: null,
      errorMessage: null,
      status: "exchanging"
    }));

    const result = await exchangePairingToken(token);
    if (result.success) {
      setState((prev) => ({ ...prev, status: "success" }));
      setTimeout(() => {
        navigate("/overview", { replace: true });
      }, 1500);
      return;
    }

    setState((prev) => ({
      ...prev,
      errorCode: result.error?.code ?? "pairing_failed",
      errorMessage: result.error?.message ?? "配對失敗",
      status: "error"
    }));
  };

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      // 1. Check if token exists in URL fragment
      const fragmentToken = extractAndClearFragmentToken();
      if (fragmentToken) {
        await performExchange(fragmentToken);
        return;
      }

      // 2. Check if already paired
      const currentStatus = await checkDevicePairingStatus();
      if (!active) {
        return;
      }

      if (currentStatus?.paired) {
        setState({
          clientId: currentStatus.clientId ?? null,
          deviceId: currentStatus.deviceId ?? null,
          errorCode: null,
          errorMessage: null,
          status: "already_paired"
        });
        return;
      }

      setState({
        clientId: null,
        deviceId: null,
        errorCode: null,
        errorMessage: null,
        status: "idle"
      });
    };

    void initialize();

    return () => {
      active = false;
    };
  }, []);

  return (
    <DevicePairingView
      clientId={state.clientId}
      deviceId={state.deviceId}
      errorCode={state.errorCode}
      errorMessage={state.errorMessage}
      onExchange={performExchange}
      onRetry={() =>
        setState((prev) => ({
          ...prev,
          errorCode: null,
          errorMessage: null,
          status: "idle"
        }))
      }
      status={state.status}
    />
  );
}
