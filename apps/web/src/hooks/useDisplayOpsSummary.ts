import type { DisplayOpsSummary } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { getDisplayOpsSummary } from "../services/api";

type UseDisplayOpsSummaryResult = {
  errorMessage: string;
  isLoading: boolean;
  reload: () => Promise<void>;
  summary: DisplayOpsSummary | null;
};

type UseDisplayOpsSummaryOptions = {
  enabled?: boolean;
};

export function useDisplayOpsSummary(options: UseDisplayOpsSummaryOptions = {}): UseDisplayOpsSummaryResult {
  const enabled = options.enabled ?? true;
  const [summary, setSummary] = useState<DisplayOpsSummary | null>(null);
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
      setSummary(await getDisplayOpsSummary());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "載入 display operations 失敗。");
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
    summary
  };
}
