import { imageMocks } from "../../mocks/images";
import { KioskButton } from "../../components/KioskButton";
import { PanelCard } from "../../components/PanelCard";
import { PageScaffold } from "../shared/PageScaffold";

export function SlideshowPreview() {
  return (
    <PageScaffold
      path="/slideshow-preview"
      description="輪播預覽頁模擬實際投放順序、單張停留秒數與切換控制。"
    >
      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="預覽舞台" subtitle="PREVIEW STAGE" className="col-span-8">
          <div className="flex h-[360px] items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgba(79,122,63,0.2),rgba(245,166,35,0.18))]">
            <div className="text-center">
              <p className="font-en text-sm uppercase tracking-[0.24em] text-brand-700">Now Showing</p>
              <p className="mt-3 text-4xl font-bold text-brand-900">{imageMocks[0]?.title}</p>
            </div>
          </div>
        </PanelCard>
        <PanelCard title="播放控制" subtitle="PLAY CONTROL" className="col-span-4">
          <div className="grid gap-3">
            <KioskButton>播放</KioskButton>
            <KioskButton variant="secondary">暫停</KioskButton>
            <KioskButton variant="ghost">下一張</KioskButton>
          </div>
        </PanelCard>
      </div>
      <PanelCard title="預覽隊列" subtitle="QUEUE ORDER">
        <div className="grid grid-cols-5 gap-4">
          {imageMocks.map((image, index) => (
            <div key={image.id} className="rounded-xl border border-neutral-100 bg-white/95 p-4">
              <div className="h-24 rounded-lg bg-[linear-gradient(135deg,rgba(79,122,63,0.16),rgba(245,166,35,0.14))]" />
              <p className="mt-3 text-lg font-semibold text-neutral-800">{index + 1}. {image.title}</p>
              <p className="mt-1 text-sm text-neutral-500">{image.durationSec} sec</p>
            </div>
          ))}
        </div>
      </PanelCard>
    </PageScaffold>
  );
}
