import type { DataHubManagementScope } from "../../app/dataHub";

const siteLabels: Record<Exclude<DataHubManagementScope, "all" | "global">, string> = {
  cl: "CL",
  kn: "KN"
};

export function SharedInfrastructureBanner({
  kind,
  managementScope
}: {
  kind: "broker" | "weather";
  managementScope: DataHubManagementScope;
}) {
  const siteFilter = managementScope === "cl" || managementScope === "kn" ? siteLabels[managementScope] : null;
  const title = kind === "broker" ? "中央 MQTT Broker 是全系統共用基礎設施" : "天氣／外部資料是全系統共用設定";
  const detail = kind === "broker"
    ? "CL 與 KN 使用同一個中央 Broker。這裡的連線設定不是單一廠區專屬。"
    : "天氣來源與測站設定套用到整個系統，不會依廠區複製一份。";
  const siteNote = siteFilter
    ? `目前畫面篩選為 ${siteFilter}，但儲存此設定會影響所有廠區，不只 ${siteFilter}。`
    : "儲存此設定會影響所有廠區。";

  return (
    <aside
      className="rounded-lg border border-[#ead7aa] bg-[#fff8e8] p-3 text-sm text-[#5c4a1f]"
      data-shared-infrastructure={kind}
      role="note"
    >
      <strong className="block text-[#3f3416]">{title}</strong>
      <p className="mt-1">{detail}</p>
      <p className="mt-1" data-shared-infrastructure-scope={managementScope}>{siteNote}</p>
    </aside>
  );
}
