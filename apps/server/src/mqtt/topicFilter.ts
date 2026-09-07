export function matchesMqttTopicFilter(filter: string, topic: string) {
  const filterLevels = filter.split("/");
  const topicLevels = topic.split("/");
  for (let index = 0; index < filterLevels.length; index += 1) {
    const filterLevel = filterLevels[index];
    if (filterLevel === "#") {
      return index === filterLevels.length - 1;
    }
    if (topicLevels[index] === undefined) {
      return false;
    }
    if (filterLevel !== "+" && filterLevel !== topicLevels[index]) {
      return false;
    }
  }
  return filterLevels.length === topicLevels.length;
}
