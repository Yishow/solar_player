import { solarAssetRuntimeMap } from "../Solar/assets";
import {
  createSolarDisplayPageSeedConfig,
  type SolarDisplayPageConfig,
  type SolarIconAssetSources
} from "../Solar/displayPageConfig";
import { Solar } from "../Solar";
import type { DisplayEditorPageDefinition } from "./index";

const solarSeedIconAssetSources: SolarIconAssetSources = {
  flowNodes: {
    co2: solarAssetRuntimeMap.flow["carbon-reduction-display"],
    factory: solarAssetRuntimeMap.flow["factory-consumption-display"],
    inverter: solarAssetRuntimeMap.flow["inverter-display"],
    solar: solarAssetRuntimeMap.flow["solar-panel-display"]
  },
  kpiCards: {
    co2: solarAssetRuntimeMap.kpi["metric-co2-today"],
    efficiency: solarAssetRuntimeMap.kpi["metric-efficiency"],
    generation: solarAssetRuntimeMap.kpi["metric-generation-sun"],
    selfConsumption: solarAssetRuntimeMap.kpi["metric-self-consumption"],
    totalCo2: solarAssetRuntimeMap.kpi["metric-co2-total"]
  }
};

export const solarRuntimePageDefinition: DisplayEditorPageDefinition = {
  id: "solar",
  label: "Solar",
  renderPage: (pageId) => <Solar pageId={pageId} />,
  templateKey: "solar",
  createSeedConfig: () =>
    createSolarDisplayPageSeedConfig(
      solarAssetRuntimeMap.hero,
      "太陽能車棚與綠能展示場域",
      solarSeedIconAssetSources
    ) as Record<string, unknown>,
  renderPreview: (config) => <Solar config={config as SolarDisplayPageConfig} />
};
