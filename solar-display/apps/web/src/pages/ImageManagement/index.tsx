import { imageMocks } from "../../mocks/images";
import { KioskButton } from "../../components/KioskButton";
import { PanelCard } from "../../components/PanelCard";
import { StatusBadge } from "../../components/StatusBadge";
import { PageScaffold } from "../shared/PageScaffold";

export function ImageManagement() {
  return (
    <PageScaffold
      path="/settings/images"
      description="圖片管理頁提供素材狀態、展示位置與更新時間的 kiosk 操作骨架。"
    >
      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="素材狀態" subtitle="ASSET LIBRARY" className="col-span-8">
          <div className="space-y-3">
            {imageMocks.map((image, index) => (
              <div key={image.id} className="grid grid-cols-[1.4fr_1fr_1fr_120px] items-center gap-4 rounded-xl bg-white/95 p-4 shadow-soft">
                <div>
                  <p className="text-lg font-semibold text-neutral-800">{image.title}</p>
                  <p className="text-sm text-neutral-500">{image.id}</p>
                </div>
                <p className="text-sm text-neutral-600">{image.area}</p>
                <p className="text-sm text-neutral-600">{image.updatedAt}</p>
                <StatusBadge status={index === 3 ? "connecting" : "connected"} />
              </div>
            ))}
          </div>
        </PanelCard>
        <PanelCard title="快速操作" subtitle="QUICK ACTIONS" className="col-span-4">
          <div className="grid gap-3">
            <KioskButton>新增圖片</KioskButton>
            <KioskButton variant="secondary">同步播放清單</KioskButton>
            <KioskButton variant="ghost">檢查解析度</KioskButton>
          </div>
        </PanelCard>
      </div>
    </PageScaffold>
  );
}
