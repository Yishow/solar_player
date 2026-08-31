import type { ComponentProps } from "react";
import { DerivedMetricRegistryPanel } from "../DataSourceSettings/DerivedMetricRegistryPanel";

type DataHubDerivedMetricsProps = {
  api?: ComponentProps<typeof DerivedMetricRegistryPanel>["api"];
};

export function DataHubDerivedMetrics({ api }: DataHubDerivedMetricsProps = {}) {
  return (
    <div className="space-y-5 px-5 pb-8" data-data-hub-section="derived">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-[#687169]">Data Hub / Derived Metrics</p>
        <h2 className="text-2xl font-semibold text-[#27322b]">衍生指標</h2>
        <p className="mt-1 max-w-3xl text-sm text-[#687169]">
          由既有 Derived Metric Registry 管理公式、輸入依賴、Preview 與 custom authoring；managed 定義維持唯讀。
        </p>
      </header>
      <DerivedMetricRegistryPanel api={api} />
    </div>
  );
}
