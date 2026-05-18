import type { PlaybackPage } from "@solar-display/shared";

export type RotationPreviewRow = {
  durationLabel: string;
  id: number;
  labelEn: string;
  labelZh: string;
  orderLabel: string;
  route: string;
};

function padOrder(value: number) {
  return value.toString().padStart(2, "0");
}

export function buildRotationPreviewRows(pages: PlaybackPage[]): RotationPreviewRow[] {
  return pages
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id)
    .filter((page) => page.enabled)
    .map((page) => ({
      durationLabel: `${page.durationSeconds} 秒`,
      id: page.id,
      labelEn: page.labelEn,
      labelZh: page.labelZh,
      orderLabel: padOrder(page.displayOrder),
      route: page.route
    }));
}
