import { KioskButton } from "../../components/KioskButton";
import { LeafOrnament } from "../../components/LeafOrnament";
import { PanelCard } from "../../components/PanelCard";
import { StatusBadge } from "../../components/StatusBadge";
import { PageScaffold } from "../shared/PageScaffold";

export function OfflineError() {
  return (
    <PageScaffold
      path="/offline"
      description="離線錯誤頁用於 kiosk 網路中斷或資料源失聯時，顯示可理解的恢復資訊。"
    >
      <PanelCard title="系統暫時離線" subtitle="OFFLINE RECOVERY">
        <div className="grid grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="rounded-xl bg-white/95 p-6">
            <StatusBadge status="disconnected" label="MQTT / API 中斷" />
            <p className="mt-6 text-5xl font-bold leading-tight text-brand-900">正在等待重新連線</p>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
              目前展示播放器無法取得即時發電資料，系統將在 30 秒後自動重試，恢復後會自動返回上一個展示頁。
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <KioskButton>立即重試</KioskButton>
              <KioskButton variant="secondary">切換備援輪播</KioskButton>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-xl bg-brand-100 p-6">
            <LeafOrnament className="h-16 w-24" />
            <div>
              <p className="text-lg font-semibold text-brand-900">Retry in</p>
              <p className="mt-3 font-en text-6xl font-bold text-brand-900">00:30</p>
            </div>
          </div>
        </div>
      </PanelCard>
    </PageScaffold>
  );
}
