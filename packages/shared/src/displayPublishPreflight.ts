export type PublishPreflightFinding = {
  code: string;
  severity: "blocking" | "warning";
  message: string;
};

export function unifyPublishPreflight(input: {
  bindingErrors: string[];
  energyProfileReady: boolean;
  unsavedBindings: boolean;
}): { canPublish: boolean; findings: PublishPreflightFinding[] } {
  const findings: PublishPreflightFinding[] = [];
  if (input.unsavedBindings) {
    findings.push({ code: "UNSAVED_BINDINGS", message: "還有未儲存的資料綁定。", severity: "blocking" });
  }
  if (!input.energyProfileReady) {
    findings.push({ code: "ENERGY_PROFILE_INCOMPLETE", message: "廠區用電設定尚未完成。", severity: "blocking" });
  }
  for (const error of input.bindingErrors) {
    findings.push({ code: "BINDING_ERROR", message: error, severity: "blocking" });
  }
  return { canPublish: findings.every((finding) => finding.severity !== "blocking"), findings };
}
