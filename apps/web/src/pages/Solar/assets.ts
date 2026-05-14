import carbonReductionDisplaySource from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/carbon-reduction-display-source.png";
import factoryConsumptionDisplaySource from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/factory-consumption-display-source.png";
import inverterDisplaySource from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/inverter-display-source.png";
import metricCo2TotalSource from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/metric-co2-total-source.png";
import metricEfficiencySource from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/metric-efficiency-source.png";
import metricGenerationSunSource from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/metric-generation-sun-source.png";
import metricSelfConsumptionSource from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/metric-self-consumption-source.png";
import solarCarportHero from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/solar-carport-hero.png";
import solarPanelDisplaySource from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/solar-panel-display-source.png";

export const solarAssetRuntimeMap = {
  flow: {
    "carbon-reduction-display": carbonReductionDisplaySource,
    "factory-consumption-display": factoryConsumptionDisplaySource,
    "inverter-display": inverterDisplaySource,
    "solar-panel-display": solarPanelDisplaySource
  },
  hero: solarCarportHero,
  kpi: {
    "metric-co2-today": carbonReductionDisplaySource,
    "metric-co2-total": metricCo2TotalSource,
    "metric-efficiency": metricEfficiencySource,
    "metric-generation-sun": metricGenerationSunSource,
    "metric-self-consumption": metricSelfConsumptionSource
  }
} as const;
