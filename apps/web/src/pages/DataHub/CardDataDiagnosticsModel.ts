import type {
  DisplayCardDataResponse,
  DisplayCardDataRow,
  MetricScope
} from "@solar-display/shared";
import { isMetricScope } from "@solar-display/shared";
import { getDisplayCardData } from "../../services/api";

export type CardDataDiagnosticsSelection = {
  metricKey: string;
  scope: MetricScope;
};

export type CardDataDiagnosticsModel = DisplayCardDataResponse;

export function buildCardDataRowKey(row: Pick<DisplayCardDataRow, "cardId" | "metricScope">) {
  return `${row.metricScope}:${row.cardId}`;
}

export function filterCardDataRows(
  model: CardDataDiagnosticsModel,
  selection: CardDataDiagnosticsSelection
): CardDataDiagnosticsModel {
  return {
    ...model,
    rows: model.rows.filter(
      (row) => row.metricKey === selection.metricKey && row.metricScope === selection.scope
    )
  };
}

export async function fetchCardDataDiagnosticsModel(
  selection: CardDataDiagnosticsSelection | null | undefined
): Promise<CardDataDiagnosticsModel | null> {
  if (!selection?.metricKey.trim() || !isMetricScope(selection.scope)) return null;
  return filterCardDataRows(await getDisplayCardData(), selection);
}
