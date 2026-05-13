import { useEffect, useState } from "react";
import { KioskButton } from "../../components/KioskButton";
import { MetricCard } from "../../components/MetricCard";
import { PanelCard } from "../../components/PanelCard";
import { DataCardGrid } from "../../components/DataCardGrid";
import { requestJson } from "../../services/api";
import { PageScaffold } from "../shared/PageScaffold";

type DeviceStatus = {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptimeSeconds: number;
  cpu: { cores: number; loadAvg: [number, number, number] };
  memory: { totalMB: number; usedMB: number; freeMB: number; usePercent: number };
  disk: { totalMB: number; usedMB: number; availableMB: number; usePercent: number };
  pid: number;
};

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} 天 ${hours} 時`;
  if (hours > 0) return `${hours} 時 ${minutes} 分`;
  return `${minutes} 分`;
}

export function DeviceStatus() {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const resp = await requestJson<{ success: boolean; data: DeviceStatus }>("/api/device/status");
        if (active) setStatus(resp.data);
      } catch {
        // fallback
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const handleReboot = async () => {
    try {
      await requestJson("/api/device/reboot", { method: "POST" });
    } catch {
      // expected: disabled in production
    }
  };

  const handleClearCache = async () => {
    try {
      await requestJson("/api/device/clear-cache", { method: "POST" });
    } catch {
      // fallback
    }
  };

  if (isLoading) {
    return (
      <PageScaffold path="/device-status" description="裝置狀態">
        <p className="text-center text-neutral-500">載入中...</p>
      </PageScaffold>
    );
  }

  return (
    <PageScaffold path="/device-status" description="裝置即時狀態、系統資源與維護操作。">
      <PanelCard title="系統資訊" subtitle="SYSTEM INFO">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-neutral-500">主機名稱</span>
            <p className="font-semibold text-neutral-800">{status?.hostname ?? "-"}</p>
          </div>
          <div>
            <span className="text-neutral-500">平台</span>
            <p className="font-semibold text-neutral-800">{status?.platform} / {status?.arch}</p>
          </div>
          <div>
            <span className="text-neutral-500">Node.js</span>
            <p className="font-semibold text-neutral-800">{status?.nodeVersion ?? "-"}</p>
          </div>
          <div>
            <span className="text-neutral-500">運行時間</span>
            <p className="font-semibold text-neutral-800">{status ? formatUptime(status.uptimeSeconds) : "-"}</p>
          </div>
          <div>
            <span className="text-neutral-500">CPU 核心</span>
            <p className="font-semibold text-neutral-800">{status?.cpu.cores ?? 0}</p>
          </div>
          <div>
            <span className="text-neutral-500">PID</span>
            <p className="font-semibold text-neutral-800">{status?.pid ?? 0}</p>
          </div>
        </div>
      </PanelCard>

      <DataCardGrid columns={3}>
        <MetricCard
          icon="🧠"
          label="記憶體使用"
          value={String(status?.memory.usePercent ?? 0)}
          unit="%"
          helper={`${status?.memory.usedMB ?? 0} / ${status?.memory.totalMB ?? 0} MB`}
        />
        <MetricCard
          icon="💾"
          label="磁碟使用"
          value={String(status?.disk.usePercent ?? 0)}
          unit="%"
          helper={`${status?.disk.usedMB ?? 0} / ${status?.disk.totalMB ?? 0} MB`}
        />
        <MetricCard
          icon="⚡"
          label="CPU 負載"
          value={String(status?.cpu.loadAvg[0] ?? 0)}
          unit=""
          helper={`1m / 5m / 15m: ${status?.cpu.loadAvg.map((v) => v.toFixed(2)).join(" / ")}`}
        />
      </DataCardGrid>

      <PanelCard title="維護操作" subtitle="MAINTENANCE">
        <div className="grid grid-cols-3 gap-4">
          <KioskButton variant="secondary" onClick={() => void handleReboot()}>
            重新開機（已停用）
          </KioskButton>
          <KioskButton variant="secondary" onClick={() => void handleClearCache()}>
            清除快取
          </KioskButton>
          <KioskButton variant="ghost" onClick={() => window.location.reload()}>
            重新整理頁面
          </KioskButton>
        </div>
      </PanelCard>
    </PageScaffold>
  );
}
