import type { CSSProperties } from "react";
import {
  DisplayCardFrame,
  DisplayCardHeader
} from "../../../components/displayPageCards";
import type { OverviewPhasePowerViewModel } from "../viewModel";

const phaseColumns = [
  { key: "voltage" as const, label: "電壓", unit: "V" },
  { key: "current" as const, label: "電流", unit: "A" },
  { key: "power" as const, label: "功率", unit: "kW" }
];

export function PhasePowerTableWidget({
  phasePower,
  style
}: {
  phasePower: OverviewPhasePowerViewModel;
  style?: CSSProperties;
}) {
  return (
    <DisplayCardFrame className="overview-dashboard-widget overview-phase-power-widget" style={style} surface="info">
      <DisplayCardHeader subtitle="Three-Phase Power" title="三相電力" />
      <table className="overview-phase-power-table">
        <thead>
          <tr>
            <th scope="col" className="overview-phase-power-corner">相</th>
            {phaseColumns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
                <span className="overview-phase-power-unit">{column.unit}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {phasePower.phases.map((phase) => (
            <tr
              key={phase.id}
              className={phase.available ? "overview-phase-row" : "overview-phase-row overview-phase-row-fallback"}
            >
              <th scope="row">{phase.id}</th>
              <td>{phase.voltage}</td>
              <td>{phase.current}</td>
              <td>{phase.power}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DisplayCardFrame>
  );
}
