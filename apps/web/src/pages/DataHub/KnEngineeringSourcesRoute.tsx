import { useEffect, useState } from "react";
import { useLoaderData, type LoaderFunctionArgs } from "react-router-dom";
import type { EngineeringSourceDefinition } from "@solar-display/shared";
import { requestJson } from "../../services/api";
import { DataHubSectionState } from "./sectionState";
import {
  KnEngineeringSourcesView,
  type EngineeringReportHeadView
} from "./KnEngineeringSourcesView";

type EngineeringSourcesResponse = {
  success: boolean;
  sources: EngineeringSourceDefinition[];
};

type EngineeringResultsResponse = {
  success: boolean;
  heads?: EngineeringReportHeadView[];
};

export type KnEngineeringSourcesRouteModel = {
  errorMessage: string;
  reportHeads: EngineeringReportHeadView[];
  sources: EngineeringSourceDefinition[];
};

export async function loadKnEngineeringSourcesRoute({ request }: LoaderFunctionArgs): Promise<KnEngineeringSourcesRouteModel> {
  try {
    const query = "?scope=kn";
    const [sourcesResponse, resultsResponse] = await Promise.all([
      requestJson<EngineeringSourcesResponse>(`/api/data-hub/engineering-sources${query}`),
      requestJson<EngineeringResultsResponse>(`/api/data-hub/engineering-results${query}`)
    ]);
    return {
      errorMessage: "",
      reportHeads: resultsResponse.heads ?? [],
      sources: sourcesResponse.sources
    };
  } catch {
    return {
      errorMessage: "工程來源資料同步失敗。",
      reportHeads: [],
      sources: []
    };
  }
}

export function KnEngineeringSourcesRoute() {
  const model = useLoaderData() as KnEngineeringSourcesRouteModel | undefined;
  const [sources, setSources] = useState(model?.sources ?? []);

  useEffect(() => {
    setSources(model?.sources ?? []);
  }, [model?.sources]);

  if (!model) {
    return <DataHubSectionState status="loading" />;
  }

  if (model.errorMessage) {
    return <DataHubSectionState status="error" message={model.errorMessage} />;
  }

  return (
    <section className="space-y-4" data-data-hub-section="engineering-sources">
      <header>
        <p className="text-xs text-[#687169]">
          KN 八項工程的工程來源註冊、Exact Topic、發布端與日報到件狀態。
        </p>
      </header>
      <KnEngineeringSourcesView
        reportHeads={model.reportHeads}
        sources={sources}
        onPreviewSource={(draft) => requestJson<{ previewToken: string; canonicalDraft: EngineeringSourceDefinition }>(
          "/api/data-hub/engineering-sources/preview",
          { method: "POST", body: JSON.stringify(draft) }
        )}
        onSaveSource={async (draft, previewToken, expectedRevision) => {
          const response = await requestJson<{ source: EngineeringSourceDefinition }>(
            "/api/data-hub/engineering-sources/apply",
            {
              method: "POST",
              body: JSON.stringify({ draft, expectedRevision, previewToken })
            }
          );
          setSources((current) => current.map((source) =>
            source.sourceRef === response.source.sourceRef ? response.source : source
          ));
        }}
      />
    </section>
  );
}
