import type { DisplayOpsAssetReferenceSummary } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { getImageAssetReferences } from "../services/api";

type UseImageAssetReferencesResult = {
  errorMessage: string;
  isLoading: boolean;
  references: DisplayOpsAssetReferenceSummary | null;
  reload: () => Promise<void>;
};

export function useImageAssetReferences(assetId: number | null): UseImageAssetReferencesResult {
  const [references, setReferences] = useState<DisplayOpsAssetReferenceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const load = async () => {
    if (assetId === null) {
      setReferences(null);
      setIsLoading(false);
      setErrorMessage("");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    try {
      setReferences(await getImageAssetReferences(assetId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "載入素材引用失敗。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [assetId]);

  return {
    errorMessage,
    isLoading,
    references,
    reload: load
  };
}
