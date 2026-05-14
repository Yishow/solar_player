const aspectRatioChoiceMap = {
  auto: null,
  "1:1": 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9
} as const;

const aspectRatioTolerance = 0.02;

export function formatAspectRatioChoice(value: number | null) {
  if (value === null) {
    return "auto";
  }

  const matchedChoice = Object.entries(aspectRatioChoiceMap).find(([, ratio]) => {
    if (ratio === null) {
      return false;
    }

    return Math.abs(ratio - value) <= aspectRatioTolerance;
  });

  return matchedChoice?.[0] ?? "custom";
}

export function formatAspectRatioLabel(value: number | null) {
  if (value === null) {
    return "原始比例 Auto";
  }

  const knownChoice = formatAspectRatioChoice(value);
  if (knownChoice !== "custom") {
    return knownChoice;
  }

  return `${value.toFixed(2)} : 1`;
}

export function parseAspectRatioChoice(choice: string, currentValue: number | null = null) {
  if (choice === "custom") {
    return currentValue;
  }

  return aspectRatioChoiceMap[choice as keyof typeof aspectRatioChoiceMap] ?? currentValue;
}