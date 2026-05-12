import { imageMocks } from "../../mocks/images";
import { KioskButton } from "../../components/KioskButton";
import { PanelCard } from "../../components/PanelCard";
import { PageScaffold } from "../shared/PageScaffold";

export function Images() {
  return (
    <PageScaffold
      path="/images"
      description="播放用圖像頁面，提供輪播素材預覽、解析度與播放秒數等 mock 資訊。"
    >
      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="素材預覽清單" subtitle="IMAGE ASSETS" className="col-span-8">
          <div className="grid grid-cols-2 gap-4">
            {imageMocks.map((image) => (
              <div key={image.id} className="rounded-xl border border-neutral-100 bg-white/95 p-4">
                <div className="h-32 rounded-lg bg-[linear-gradient(135deg,rgba(79,122,63,0.18),rgba(245,166,35,0.18))]" />
                <p className="mt-4 text-lg font-semibold text-neutral-800">{image.title}</p>
                <p className="mt-1 text-sm text-neutral-500">{image.area}</p>
                <div className="mt-3 flex justify-between text-sm text-neutral-500">
                  <span>{image.durationSec} sec</span>
                  <span>{image.resolution}</span>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
        <PanelCard title="播放摘要" subtitle="QUEUE STATUS" className="col-span-4">
          <div className="space-y-4">
            <div className="rounded-xl bg-brand-100 p-4">
              <p className="text-lg font-semibold text-brand-900">目前輪播共 {imageMocks.length} 張</p>
              <p className="mt-2 text-sm text-neutral-600">最後更新：{imageMocks[0]?.updatedAt}</p>
            </div>
            <KioskButton className="w-full">播放完整輪播</KioskButton>
            <KioskButton variant="secondary" className="w-full">
              僅播放 ESG 素材
            </KioskButton>
          </div>
        </PanelCard>
      </div>
    </PageScaffold>
  );
}
