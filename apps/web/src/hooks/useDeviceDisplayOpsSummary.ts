import type { DeviceDisplayOpsSummary } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { getDeviceDisplayOpsSummary } from "../services/api";

type UseDeviceDisplayOpsSummaryResult = {
  errorMessage: string;
  isLoading: boolean;
  reload: () => Promise<void>;
  summary: DeviceDisplayOpsSummary | null;
};

export function useDeviceDisplayOpsSummary(): UseDeviceDisplayOpsSummaryResult {
  const [summary, setSummary] = useState<DeviceDisplayOpsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const load = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      setSummary(await getDeviceDisplayOpsSummary());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "載入 display diagnostics 失敗。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return {
    errorMessage,
    isLoading,
    reload: load,
    summary
  };
}
