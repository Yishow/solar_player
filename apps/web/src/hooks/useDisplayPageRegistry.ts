import type { DisplayPageInstance } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { getDisplayPageRegistry } from "../services/api";

export function useDisplayPageRegistry() {
  const [pages, setPages] = useState<DisplayPageInstance[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const nextPages = await getDisplayPageRegistry();
      setPages(nextPages.filter((page) => page.enabled && page.archivedAt === null));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "載入 display page registry 失敗。");
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
    pages,
    reload: load
  };
}
