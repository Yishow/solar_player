export const displayPageKeys = [
  "overview",
  "solar",
  "factory-circuit",
  "images",
  "sustainability"
] as const;

export type DisplayPageKey = (typeof displayPageKeys)[number];

export type DisplayPageConfigEnvelope<TRegions extends Record<string, unknown> = Record<string, unknown>> = {
  pageId: DisplayPageKey;
  regions: TRegions;
  updatedAt: string | null;
  version: 1;
};

export function isDisplayPageKey(value: string): value is DisplayPageKey {
  return displayPageKeys.includes(value as DisplayPageKey);
}

export function createEmptyDisplayPageConfig(
  pageId: DisplayPageKey
): DisplayPageConfigEnvelope<Record<string, never>> {
  return {
    pageId,
    regions: {},
    updatedAt: null,
    version: 1
  };
}
