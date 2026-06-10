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

type UseDisplayReadinessOptions = {
  enabled?: boolean;
};

export function useDisplayReadiness(options: UseDisplayReadinessOptions = {}): UseDisplayReadinessResult {
  const enabled = options.enabled ?? true;
  const [readiness, setReadiness] = useState<DisplayReadinessReport | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const load = async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

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
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    void load();
  }, [enabled]);

  return {
    accessDenied,
    errorMessage,
    isLoading,
    readiness,
    reload: load
  };
}
