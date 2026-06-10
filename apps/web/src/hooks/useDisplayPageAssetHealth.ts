import type { DisplayPageAssetHealthReport } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { getDisplayPageAssetHealth } from "../services/api";

type UseDisplayPageAssetHealthResult = {
  errorMessage: string;
  isLoading: boolean;
  reload: () => Promise<void>;
  report: DisplayPageAssetHealthReport | null;
};

type UseDisplayPageAssetHealthOptions = {
  enabled?: boolean;
};

export function useDisplayPageAssetHealth(
  options: UseDisplayPageAssetHealthOptions = {}
): UseDisplayPageAssetHealthResult {
  const enabled = options.enabled ?? true;
  const [report, setReport] = useState<DisplayPageAssetHealthReport | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [errorMessage, setErrorMessage] = useState("");

  const load = async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextReport = await getDisplayPageAssetHealth();
      setReport(nextReport);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "載入素材健康狀態失敗。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    void load();
  }, [enabled]);

  return {
    errorMessage,
    isLoading,
    reload: load,
    report
  };
}
