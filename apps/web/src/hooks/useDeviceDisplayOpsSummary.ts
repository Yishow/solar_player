import type { DeviceDisplayOpsSummary } from "@solar-display/shared";
import { useEffect, useState } from "react";
import {
  getDeviceDisplayOpsSummary,
  isManagementAccessDeniedError
} from "../services/api";

type UseDeviceDisplayOpsSummaryResult = {
  accessDenied: boolean;
  errorMessage: string;
  isLoading: boolean;
  reload: () => Promise<void>;
  summary: DeviceDisplayOpsSummary | null;
};

export function useDeviceDisplayOpsSummary(): UseDeviceDisplayOpsSummaryResult {
  const [summary, setSummary] = useState<DeviceDisplayOpsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const load = async () => {
    setIsLoading(true);
    setAccessDenied(false);
    setErrorMessage("");
    try {
      setSummary(await getDeviceDisplayOpsSummary());
    } catch (error) {
      setSummary(null);
      if (isManagementAccessDeniedError(error)) {
        setAccessDenied(true);
        setErrorMessage("此頁面僅對受信任的管理端開放。");
      } else {
        setErrorMessage(error instanceof Error ? error.message : "載入 display diagnostics 失敗。");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return {
    accessDenied,
    errorMessage,
    isLoading,
    reload: load,
    summary
  };
}
