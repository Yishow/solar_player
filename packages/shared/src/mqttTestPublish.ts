export type MqttSafetyAction = "connection-test" | "parse-preview" | "real-publish";

export function mqttSafetyActionPublishes(action: MqttSafetyAction) {
  return action === "real-publish";
}

export function realPublishConfirmation(input: {
  broker: string;
  confirmed: boolean;
  metricScope: "cl" | "kn" | "global";
  retain?: boolean;
  topic: string;
  value: string;
}) {
  if (!input.confirmed) {
    throw Object.assign(new Error("PUBLISH_CONFIRMATION_REQUIRED"), { code: "PUBLISH_CONFIRMATION_REQUIRED" });
  }
  return {
    actualPublish: true as const,
    broker: input.broker,
    metricScope: input.metricScope,
    retain: input.retain === true,
    topic: input.topic,
    value: input.value
  };
}
