import { DisplayPagesEditor } from "./index";
import { runtimePageDefinitions } from "./runtimePageDefinitions";

export function DisplayPagesEditorRoute() {
  return <DisplayPagesEditor pageDefinitions={runtimePageDefinitions} />;
}
