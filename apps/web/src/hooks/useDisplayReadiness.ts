import type { DisplayReadinessReport } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { getDisplayReadiness, isManagementAccessDeniedError } from "../services/api";

type UseDisplayReadinessResult = {
  accessDenied: boolean;
  errorMessage: string;
  isLoading: boolean;
  readiness: DisplayReadinessReport | null;
  reload: () => Promise<void>;
};

export function useDisplayReadiness(): UseDisplayReadinessResult {
  const [readiness, setReadiness] = useState<DisplayReadinessReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const load = async () => {
    setIsLoading(true);
    setAccessDenied(false);
    setErrorMessage("");
    try {
      setReadiness(await getDisplayReadiness());
    } catch (error) {
      setReadiness(null);
      if (isManagementAccessDeniedError(error)) {
        setAccessDenied(true);
        setErrorMessage("此頁面僅對受信任的管理端開放。");
      } else {
        setErrorMessage(error instanceof Error ? error.message : "載入 readiness 失敗。");
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
    readiness,
    reload: load
  };
}
