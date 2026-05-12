import { KioskButton } from "../../components/KioskButton";
import { KioskInput } from "../../components/KioskInput";
import { KioskSelect } from "../../components/KioskSelect";
import { KioskToggle } from "../../components/KioskToggle";
import { PanelCard } from "../../components/PanelCard";
import { PageScaffold } from "../shared/PageScaffold";

export function PlaybackSettings() {
  return (
    <PageScaffold
      path="/settings/playback"
      description="管理播放清單、輪播秒數與自動切頁行為的設定頁 mock。"
    >
      <PanelCard title="輪播參數" subtitle="PLAYBACK CONTROL">
        <div className="grid grid-cols-2 gap-4">
          <KioskInput label="預設停留秒數" defaultValue="10" />
          <KioskInput label="離線重試秒數" defaultValue="30" />
          <KioskSelect
            label="轉場效果"
            defaultValue="fade"
            options={[
              { label: "淡入淡出", value: "fade" },
              { label: "水平滑動", value: "slide" }
            ]}
          />
          <KioskSelect
            label="首頁啟動頁"
            defaultValue="overview"
            options={[
              { label: "總覽頁", value: "overview" },
              { label: "太陽能頁", value: "solar" }
            ]}
          />
        </div>
      </PanelCard>
      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="自動化選項" subtitle="AUTOMATION" className="col-span-7">
          <div className="space-y-4">
            <KioskToggle checked label="自動輪播" description="無人操作時持續播放展示頁" />
            <KioskToggle checked label="回首頁保護" description="超過 60 秒無操作自動回到總覽" />
            <KioskToggle checked={false} label="夜間靜音模式" description="19:00 後停用提示音效" />
          </div>
        </PanelCard>
        <PanelCard title="操作" subtitle="ACTIONS" className="col-span-5">
          <div className="grid gap-3">
            <KioskButton>儲存設定</KioskButton>
            <KioskButton variant="secondary">預覽輪播</KioskButton>
            <KioskButton variant="ghost">還原預設</KioskButton>
          </div>
        </PanelCard>
      </div>
    </PageScaffold>
  );
}
