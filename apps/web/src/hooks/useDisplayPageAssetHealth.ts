import type { DisplayPageAssetHealthReport } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { getDisplayPageAssetHealth } from "../services/api";

type UseDisplayPageAssetHealthResult = {
  errorMessage: string;
  isLoading: boolean;
  reload: () => Promise<void>;
  report: DisplayPageAssetHealthReport | null;
};

export function useDisplayPageAssetHealth(): UseDisplayPageAssetHealthResult {
  const [report, setReport] = useState<DisplayPageAssetHealthReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const load = async () => {
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
    void load();
  }, []);

  return {
    errorMessage,
    isLoading,
    reload: load,
    report
  };
}
