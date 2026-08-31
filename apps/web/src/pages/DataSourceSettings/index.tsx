import { PageScaffold } from "../shared/PageScaffold";
import { DerivedMetricRegistryPanel } from "./DerivedMetricRegistryPanel";
import {
  DataSourceOperations,
  loadDataSourceOperationsRoute
} from "./DataSourceOperations";

export { DataSourceOperations, loadDataSourceOperationsRoute } from "./DataSourceOperations";

export async function loadDataSourceSettingsRoute() {
  return loadDataSourceOperationsRoute();
}

export function DataSourceSettings() {
  return (
    <PageScaffold
      path="/settings/data-source"
      description="目前資料來源、儲存位置與建議維運項目"
    >
      <DataSourceOperations showTodayReset>
        <DerivedMetricRegistryPanel />
      </DataSourceOperations>
    </PageScaffold>
  );
}
