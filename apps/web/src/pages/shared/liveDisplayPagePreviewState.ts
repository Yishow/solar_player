import type { DisplayPageConfigEnvelope, DisplayPageInstance } from "@solar-display/shared";
import { mergeDisplayPageConfigEnvelope } from "../../hooks/useDisplayPageConfig";
import type { LiveDisplayPagePreviewState } from "./liveDisplayPagePreview";
import type { LiveDisplayPagePreviewRegistryEntry } from "./liveDisplayPagePreviewRegistry";

export type LiveDisplayPagePreviewStates = Record<string, LiveDisplayPagePreviewState>;

function resolvePreviewDetailFromEnvelope(envelope: DisplayPageConfigEnvelope) {
  return envelope.assetFindings?.[0]?.message ?? "正式素材或顯示契約目前無法完整解析。";
}

export function createLoadingLiveDisplayPagePreviewState(): LiveDisplayPagePreviewState {
  return {
    detail: "正在同步正式預覽...",
    status: "loading"
  };
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
    config: mergeDisplayPageConfigEnvelope(args.definition.createSeedConfig(), args.envelope),
    status: "ready"
  };
}

export async function buildLiveDisplayPagePreviewStates(args: {
  definitions: LiveDisplayPagePreviewRegistryEntry[];
  pages: DisplayPageInstance[];
  readLiveConfig: (pageKey: string) => Promise<DisplayPageConfigEnvelope>;
}): Promise<LiveDisplayPagePreviewStates> {
  const definitionsByTemplateKey = new Map(args.definitions.map((definition) => [definition.id, definition] as const));
  const entries = await Promise.all(
    args.pages.map(async (page) => {
      const definition = definitionsByTemplateKey.get(page.templateKey);

      try {
        const envelope = await args.readLiveConfig(page.pageKey);
        return [page.pageKey, buildLiveDisplayPagePreviewState({ definition, envelope })] as const;
      } catch (error) {
        return [
          page.pageKey,
          buildLiveDisplayPagePreviewState({
            definition,
            errorMessage: error instanceof Error ? error.message : "載入正式展示頁設定失敗。"
          })
        ] as const;
      }
    })
  );

  return Object.fromEntries(entries);
}

export function resolveLiveDisplayPagePreviewState(
  pageKey: string,
  states: LiveDisplayPagePreviewStates
): LiveDisplayPagePreviewState {
  return states[pageKey] ?? createLoadingLiveDisplayPagePreviewState();
}
