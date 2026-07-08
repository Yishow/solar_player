export type MonitoringSourceTooltipInput = {
  dependencyKeys?: string[];
  label: string;
  metricKey: string;
  sourceTopics?: Array<{ metricKey: string; topic: string }>;
  sourceClass?: string | null;
  topic?: string | null;
  unit?: string | null;
};

export function buildMonitoringSourceTooltip(input: MonitoringSourceTooltipInput) {
  const dependencyKeys = (input.dependencyKeys ?? []).filter((key) => key !== input.metricKey);
  const sourceTopics = (input.sourceTopics ?? []).flatMap((sourceTopic) => {
    const topic = sourceTopic.topic.trim();
    return topic ? [`${sourceTopic.metricKey}=${topic}`] : [];
  });
  const topic = sourceTopics.length > 0 ? sourceTopics.join(", ") : input.topic?.trim() || "--";
  const unit = input.unit?.trim() || "--";

  return [
    input.label,
    `Metric: ${input.metricKey}`,
    `Source: ${input.sourceClass ?? "--"}`,
    `Topic: ${topic}`,
    `Unit: ${unit}`,
    `Depends on: ${dependencyKeys.length > 0 ? dependencyKeys.join(", ") : "--"}`
  ].join("\n");
}
