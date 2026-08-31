import type { ComponentProps } from "react";
import { DerivedMetricRegistryPanel } from "../DataSourceSettings/DerivedMetricRegistryPanel";

type DataHubDerivedMetricsProps = {
  api?: ComponentProps<typeof DerivedMetricRegistryPanel>["api"];
};

export function DataHubDerivedMetrics({ api }: DataHubDerivedMetricsProps = {}) {
  return (
    <div className="space-y-5" data-data-hub-section="derived">
      <header>
        <p className="text-xs text-[#687169]">
          由既有 Derived Metric Registry 管理公式、輸入依賴、Preview 與 custom authoring；managed 定義維持唯讀。
        </p>
      </header>
      <DerivedMetricRegistryPanel api={api} />
    </div>
  );
}
