import type { DisplayReadinessReport } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { getDisplayReadiness } from "../services/api";

type UseDisplayReadinessResult = {
  errorMessage: string;
  isLoading: boolean;
  readiness: DisplayReadinessReport | null;
  reload: () => Promise<void>;
};

export function useDisplayReadiness(): UseDisplayReadinessResult {
  const [readiness, setReadiness] = useState<DisplayReadinessReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const load = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      setReadiness(await getDisplayReadiness());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "載入 readiness 失敗。");
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
    readiness,
    reload: load
  };
}
