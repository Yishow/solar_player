import type { DisplayOpsAssetReferenceSummary } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { getImageAssetReferences } from "../services/api";

type UseImageAssetReferencesResult = {
  errorMessage: string;
  isLoading: boolean;
  references: DisplayOpsAssetReferenceSummary | null;
  reload: (nextAssetId?: number | null) => Promise<void>;
};

type UseImageAssetReferencesOptions = {
  enabled?: boolean;
};

export function useImageAssetReferences(
  assetId: number | null,
  options: UseImageAssetReferencesOptions = {}
): UseImageAssetReferencesResult {
  const enabled = options.enabled ?? true;
  const [references, setReferences] = useState<DisplayOpsAssetReferenceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const load = async (nextAssetId: number | null = assetId) => {
    if (!enabled || nextAssetId === null) {
      setReferences(null);
      setIsLoading(false);
      setErrorMessage("");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    try {
      setReferences(await getImageAssetReferences(nextAssetId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "載入素材引用失敗。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [assetId, enabled]);

  return {
    errorMessage,
    isLoading,
    references,
    reload: load
  };
}
