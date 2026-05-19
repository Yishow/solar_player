import type { DisplayPageConfigEnvelope, DisplayPageKey } from "@solar-display/shared";
import { displayPageKeys } from "@solar-display/shared";
import { useEffect, useMemo, useState } from "react";
import { mergeDisplayPageConfig } from "../../hooks/useDisplayPageConfig";
import { getDisplayPageConfig } from "../../services/api";
import type { LiveDisplayPagePreviewState } from "./liveDisplayPagePreview";
import {
  liveDisplayPagePreviewRegistry,
  type LiveDisplayPagePreviewRegistryEntry
} from "./liveDisplayPagePreviewRegistry";

export type LiveDisplayPagePreviewCatalog = Partial<Record<DisplayPageKey, LiveDisplayPagePreviewState>>;

function resolvePreviewDetailFromEnvelope(envelope: DisplayPageConfigEnvelope) {
  return envelope.assetFindings?.[0]?.message ?? "正式素材或顯示契約目前無法完整解析。";
}

export function buildLiveDisplayPagePreviewState(args: {
  definition?: LiveDisplayPagePreviewRegistryEntry;
  envelope?: DisplayPageConfigEnvelope | null;
  errorMessage?: string;
}): LiveDisplayPagePreviewState {
  if (!args.definition?.renderPreview) {
    return {
      detail: "目前沒有可用的 page preview renderer。",
      status: "renderer-unavailable"
    };
  }

  if (args.errorMessage) {
    return {
      detail: args.errorMessage,
      status: "config-unavailable"
    };
  }

  if (!args.envelope?.publishedAt) {
    return {
      detail: "此展示頁尚未發布到 live stage。",
      status: "unpublished"
    };
  }

  if ((args.envelope.assetFindings?.length ?? 0) > 0) {
    return {
      detail: resolvePreviewDetailFromEnvelope(args.envelope),
      status: "asset-unavailable"
    };
  }

  return {
    config: mergeDisplayPageConfig(args.definition.createSeedConfig(), args.envelope.regions),
    status: "ready"
  };
}

export function useLiveDisplayPagePreviewCatalog() {
  const definitions = useMemo(() => liveDisplayPagePreviewRegistry, []);
  const [states, setStates] = useState<LiveDisplayPagePreviewCatalog>(() =>
    Object.fromEntries(
      displayPageKeys.map((pageKey) => [
        pageKey,
        {
          detail: "正在同步正式預覽...",
          status: "loading"
        } satisfies LiveDisplayPagePreviewState
      ])
    ) as LiveDisplayPagePreviewCatalog
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      const nextEntries = await Promise.all(
        displayPageKeys.map(async (pageKey) => {
          const definition = definitions.find((entry) => entry.id === pageKey);

          try {
            const envelope = await getDisplayPageConfig(pageKey, "live");
            return [pageKey, buildLiveDisplayPagePreviewState({ definition, envelope })] as const;
          } catch (error) {
            return [
              pageKey,
              buildLiveDisplayPagePreviewState({
                definition,
                errorMessage: error instanceof Error ? error.message : "載入正式展示頁設定失敗。"
              })
            ] as const;
          }
        })
      );

      if (!active) {
        return;
      }

      setStates(Object.fromEntries(nextEntries) as LiveDisplayPagePreviewCatalog);
    };

    void load();

    return () => {
      active = false;
    };
  }, [definitions]);

  return {
    definitions,
    states
  };
}
