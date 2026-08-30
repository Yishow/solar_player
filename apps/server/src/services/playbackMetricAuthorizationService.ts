import {
  compileEffectiveBindingPlan,
  normalizeMetricBoundPageConfig,
  resolvePlaybackBindingItemConstraints,
  resolveWidgetDataBindingPageKey,
  scopedIdentityKey,
  type DisplayClientContext,
  type ScopedMetricIdentity,
} from "@solar-display/shared";
import { readStageConfig } from "./displayPagePublishingService.js";
import { readPlaybackProfilePageRows } from "./playbackProfileService.js";
import { resolveServerPlaybackMetricCatalog } from "./derivedMetricCatalogService.js";

export type PlaybackMetricAuthorizationPlan = {
  foreignSiteIdentities: ScopedMetricIdentity[];
  identities: ScopedMetricIdentity[];
  revision: string;
};

export function readPlaybackMetricAuthorizationPlan(
  context: DisplayClientContext
): PlaybackMetricAuthorizationPlan {
  const identities = new Map<string, ScopedMetricIdentity>();
  const revisionParts = [context.contextRevision];

  for (const page of readPlaybackProfilePageRows(context.profileId)) {
    if (page.enabled !== 1) continue;
    const bindingPageKey = resolveWidgetDataBindingPageKey({
      pageKey: page.page_key,
      templateKey: page.template_key
    });
    if (!bindingPageKey) continue;

    const live = readStageConfig(page.page_key, "live");
    const normalized = normalizeMetricBoundPageConfig(bindingPageKey, live.regions);
    const catalog = resolveServerPlaybackMetricCatalog(bindingPageKey);
    const items = Object.values(normalized.dataBindings).filter(({ dataBinding }) =>
      catalog.some(({ metricKey }) => metricKey === dataBinding.metricKey)
    );
    const compiled = compileEffectiveBindingPlan({
      catalog,
      context: {
        contextKey: context.contextRevision,
        siteScope: context.siteScope
      },
      itemConstraints: resolvePlaybackBindingItemConstraints(bindingPageKey),
      items,
      pageId: page.page_key
    });
    if (!compiled.ok) {
      throw new Error(
        `Invalid published widget binding ${page.page_key}.${compiled.error.itemId}: ${compiled.error.code}`
      );
    }

    revisionParts.push(`${page.page_key}:${live.version}`);
    for (const item of compiled.plan.items) {
      for (const identity of item.dependencyIdentities) {
        identities.set(
          scopedIdentityKey(identity.metricScope, identity.metricKey),
          identity
        );
      }
    }
  }

  const authorizedIdentities = [...identities.values()];
  return {
    foreignSiteIdentities: authorizedIdentities.filter(
      ({ metricScope }) =>
        metricScope !== "global" && metricScope !== context.siteScope
    ),
    identities: authorizedIdentities,
    revision: revisionParts.join("|")
  };
}
