import type { DisplayOpsSummary } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { getDisplayOpsSummary } from "../services/api";

type UseDisplayOpsSummaryResult = {
  errorMessage: string;
  isLoading: boolean;
  reload: () => Promise<void>;
  summary: DisplayOpsSummary | null;
};

export function useDisplayOpsSummary(): UseDisplayOpsSummaryResult {
  const [summary, setSummary] = useState<DisplayOpsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const load = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      setSummary(await getDisplayOpsSummary());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "載入 display operations 失敗。");
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
