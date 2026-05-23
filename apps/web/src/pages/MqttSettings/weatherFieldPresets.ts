import {
  DEFAULT_WEATHER_FIELD_KEYS,
  type WeatherFieldKey,
  weatherFieldKeys,
  type WeatherFieldPreset,
  type WeatherSettings,
  type WeatherStationOption
} from "@solar-display/shared";

type WeatherFieldPresetOption = {
  description: string;
  fieldKeys: WeatherFieldKey[] | null;
  label: string;
  value: WeatherFieldPreset;
};

export const weatherFieldPresetOptions: WeatherFieldPresetOption[] = [
  {
    description: "主資訊只保留天氣現象與溫度。",
    fieldKeys: ["weather", "airTemperature"],
    label: "精簡",
    value: "compact"
  },
  {
    description: "保留目前 header 預設的天氣、溫度、濕度與觀測時間。",
    fieldKeys: DEFAULT_WEATHER_FIELD_KEYS,
    label: "標準",
    value: "standard"
  },
  {
    description: "顯示所有可用的 weather metadata 欄位。",
    fieldKeys: [...weatherFieldKeys],
    label: "完整",
    value: "complete"
  },
  {
    description: "自行挑選欄位組合。",
    fieldKeys: null,
    label: "自訂",
    value: "custom"
  }
];

function sortFieldKeys(fieldKeys: readonly WeatherFieldKey[]) {
  const order = new Map(weatherFieldKeys.map((fieldKey, index) => [fieldKey, index] as const));
  return [...fieldKeys].sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
}

export function resolveWeatherFieldKeysForPreset(preset: WeatherFieldPreset): WeatherFieldKey[] {
  const option = weatherFieldPresetOptions.find((candidate) => candidate.value === preset);
  if (!option?.fieldKeys) {
    return DEFAULT_WEATHER_FIELD_KEYS;
  }

  return [...option.fieldKeys];
}

export function matchWeatherFieldPreset(fieldKeys: readonly WeatherFieldKey[]): WeatherFieldPreset {
  const normalized = sortFieldKeys(Array.from(new Set(fieldKeys)));

  for (const option of weatherFieldPresetOptions) {
    if (!option.fieldKeys) {
      continue;
    }

    const candidate = sortFieldKeys(option.fieldKeys);
    if (candidate.length === normalized.length && candidate.every((fieldKey, index) => fieldKey === normalized[index])) {
      return option.value;
    }
  }

  return "custom";
}

export function applyWeatherSettingChange<Key extends keyof WeatherSettings>(
  current: WeatherSettings,
  key: Key,
  value: WeatherSettings[Key],
  stations: readonly WeatherStationOption[] = []
): WeatherSettings {
  if (key === "preset") {
    const preset = value as WeatherFieldPreset;
    return {
      ...current,
      fieldKeys: preset === "custom" ? current.fieldKeys : resolveWeatherFieldKeysForPreset(preset),
      preset
    };
  }

  if (key === "countyName") {
    const countyName = value as WeatherSettings["countyName"];
    const stationStillValid =
      current.stationId !== null
      && stations.some(
        (station) =>
          station.stationId === current.stationId
          && (!countyName || station.countyName === countyName)
      );
    return {
      ...current,
      countyName,
      stationId: stationStillValid ? current.stationId : null
    };
  }

  return { ...current, [key]: value };
}

export function toggleWeatherFieldKey(
  current: WeatherSettings,
  fieldKey: WeatherFieldKey,
  enabled: boolean
): WeatherSettings {
  const nextFieldKeys = enabled
    ? sortFieldKeys(Array.from(new Set([...current.fieldKeys, fieldKey])))
    : current.fieldKeys.filter((key) => key !== fieldKey);

  return {
    ...current,
    fieldKeys: nextFieldKeys
  };
}
