export type DevicePairingStatus =
  | "checking"
  | "already_paired"
  | "idle"
  | "exchanging"
  | "success"
  | "error";

export type DevicePairingState = {
  clientId: string | null;
  deviceId: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  status: DevicePairingStatus;
};

export const initialDevicePairingState: DevicePairingState = {
  clientId: null,
  deviceId: null,
  errorCode: null,
  errorMessage: null,
  status: "checking"
};

const ERROR_MESSAGE_MAP: Record<string, string> = {
  device_disabled: "此裝置在管理端已被停用，請聯絡管理員啟用。",
  device_not_found: "查無此裝置，請確認配對 Token 是否有效。",
  pairing_https_required: "安全限制：非本機環境配對必須使用 HTTPS 傳輸。",
  pairing_token_expired: "配對 Token 已過期（有效期限 15 分鐘），請在管理端重新發行。",
  pairing_token_invalid: "配對 Token 無效，請檢查是否複製完整。",
  pairing_token_used: "此 Token 已被使用過，一次性 Token 不得重複兌換。"
};

export function mapPairingErrorMessage(code?: string | null): string {
  if (!code) {
    return "配對失敗，請確認 Token 是否正確或重新發行。";
  }
  return ERROR_MESSAGE_MAP[code] ?? `配對失敗（${code}），請確認 Token 是否正確。`;
}

export function extractAndClearFragmentToken(
  windowLike?: {
    history: { replaceState: (data: unknown, unused: string, url: string) => void };
    location: { hash: string; pathname: string };
  }
): string | null {
  const currentWindow =
    windowLike ?? (typeof window !== "undefined" ? window : undefined);
  if (!currentWindow) {
    return null;
  }

  const hash = currentWindow.location.hash.replace(/^#/u, "");
  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);
  const token = params.get("token");
  if (!token) {
    return null;
  }

  try {
    currentWindow.history.replaceState(null, "", currentWindow.location.pathname);
  } catch {
    // ignore in environments where replaceState is restricted
  }

  return token;
}

export async function checkDevicePairingStatus(
  fetchFn: typeof fetch = fetch
): Promise<{ paired: boolean; deviceId?: number; clientId?: string } | null> {
  try {
    const response = await fetchFn("/api/device-pairing/status", {
      headers: { accept: "application/json" }
    });

    if (response.status === 200) {
      const body = (await response.json()) as {
        data?: { clientId?: string; deviceId?: number; paired?: boolean };
      };
      return {
        clientId: body.data?.clientId,
        deviceId: body.data?.deviceId,
        paired: Boolean(body.data?.paired)
      };
    }

    return { paired: false };
  } catch {
    return null;
  }
}

export async function exchangePairingToken(
  token: string,
  fetchFn: typeof fetch = fetch
): Promise<{ success: boolean; error?: { code: string; message: string } }> {
  try {
    const response = await fetchFn("/api/device-pairing/exchange", {
      body: JSON.stringify({ token }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (response.status === 204) {
      return { success: true };
    }

    let code = "pairing_failed";
    try {
      const body = (await response.json()) as { code?: string };
      if (typeof body.code === "string") {
        code = body.code;
      }
    } catch {
      // ignore json parse error on non-json body
    }

    return {
      error: {
        code,
        message: mapPairingErrorMessage(code)
      },
      success: false
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "網路連線失敗";
    return {
      error: {
        code: "network_error",
        message: `連線失敗：${message}，請檢查網路連線。`
      },
      success: false
    };
  }
}
