export type ShellDensity = "playback" | "management" | "device-detail";

export const shellDensityClassMap: Record<
  ShellDensity,
  {
    container: string;
    content: string;
    panel: string;
    title: string;
  }
> = {
  playback: {
    container: "gap-8 py-page-y",
    content: "gap-6",
    panel: "rounded-[28px] p-7",
    title: "max-w-5xl"
  },
  management: {
    container: "gap-6 py-page-y",
    content: "gap-5",
    panel: "rounded-xl p-6",
    title: "max-w-4xl"
  },
  "device-detail": {
    container: "gap-6 py-page-y",
    content: "gap-6",
    panel: "rounded-2xl p-6",
    title: "max-w-4xl"
  }
};
