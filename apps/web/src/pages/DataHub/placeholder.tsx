import { useLocation } from "react-router-dom";
import { resolveDataHubSection } from "../../app/dataHub";
import { DataHubSectionState } from "./sectionState";

export function DataHubPlaceholderSection() {
  const { pathname } = useLocation();
  const section = resolveDataHubSection(pathname);

  return (
    <DataHubSectionState
      message={`${section?.label ?? "此區段"}目前沒有可顯示的資料。`}
      status="empty"
    />
  );
}
