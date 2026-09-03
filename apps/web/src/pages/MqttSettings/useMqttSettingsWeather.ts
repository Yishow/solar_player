import { useCallback, useEffect, useState } from "react";
import {
  getWeatherDiagnostics,
  getWeatherOptions,
  getWeatherPreview,
  requestJson
} from "../../services/api";
import {
  applyWeatherSettingChange,
  toggleWeatherFieldKey
} from "./weatherFieldPresets";
import type { MqttSettingsDataController } from "./useMqttSettingsData";
import type {
  WeatherDiagnostic,
  WeatherFieldKey,
  WeatherHeaderContract,
  WeatherOptionsResponse,
  WeatherSettings
} from "@solar-display/shared";
import { resolveWeatherRefreshFeedback } from "./viewModel";

export type MqttSettingsWeatherController = {
  copyWeatherDiagnostic: (text: string) => Promise<void>;
  handleWeatherSettingChange: <Key extends keyof WeatherSettings>(
    key: Key,
    value: WeatherSettings[Key]
  ) => void;
  refreshWeather: () => Promise<void>;
  toggleWeatherField: (fieldKey: WeatherFieldKey, enabled: boolean) => void;
  weatherOptions: WeatherOptionsResponse | null;
  weatherOptionsErrorMessage: string;
  weatherPreviewContract: WeatherHeaderContract | null;
  weatherPreviewErrorMessage: string;
};

export function useMqttSettingsWeather({
  data
}: {
  data: MqttSettingsDataController;
}): MqttSettingsWeatherController {
  const {
    hasLoadedWeatherSettings,
    loadWeatherDiagnostic,
    markDirty,
    setActionState,
    setErrorMessage,
    setMessage,
    setWeatherDiagnostic,
    setWeatherSettings,
    weatherSettings
  } = data;
  const [weatherOptions, setWeatherOptions] = useState<WeatherOptionsResponse | null>(null);
  const [weatherOptionsErrorMessage, setWeatherOptionsErrorMessage] = useState("");
  const [weatherPreviewContract, setWeatherPreviewContract] = useState<WeatherHeaderContract | null>(null);
  const [weatherPreviewErrorMessage, setWeatherPreviewErrorMessage] = useState("");

  useEffect(() => {
    if (!hasLoadedWeatherSettings) {
      return;
    }

    let active = true;
    void (async () => {
      try {
        const options = await getWeatherOptions(weatherSettings.countyName);
        if (active) {
          setWeatherOptions(options);
          setWeatherOptionsErrorMessage("");
        }
      } catch (error) {
        if (active) {
          setWeatherOptionsErrorMessage(
            error instanceof Error ? error.message : "目前無法載入測站選項。"
          );
        }
      } finally {
        if (active) {
          void loadWeatherDiagnostic();
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [hasLoadedWeatherSettings, loadWeatherDiagnostic, weatherSettings.countyName]);

  useEffect(() => {
    if (!hasLoadedWeatherSettings) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const contract = await getWeatherPreview(weatherSettings);
          if (active) {
            setWeatherPreviewContract(contract);
            setWeatherPreviewErrorMessage("");
          }
        } catch (error) {
          if (active) {
            setWeatherPreviewContract(null);
            setWeatherPreviewErrorMessage(
              error instanceof Error ? error.message : "目前無法取得 weather preview。"
            );
          }
        }
      })();
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // Preview only depends on the server-resolved location snapshot; field/preset
    // composition is applied locally in the view model.
  }, [
    hasLoadedWeatherSettings,
    weatherSettings.countyName,
    weatherSettings.enabled,
    weatherSettings.locationMode,
    weatherSettings.stationId
  ]);

  const handleWeatherSettingChange = useCallback(<Key extends keyof WeatherSettings>(
    key: Key,
    value: WeatherSettings[Key]
  ) => {
    markDirty("天氣設定已變更，尚未儲存。");
    setWeatherSettings((current) =>
      applyWeatherSettingChange(current, key, value, weatherOptions?.stations ?? [])
    );
  }, [markDirty, setWeatherSettings, weatherOptions]);

  const toggleWeatherField = useCallback((fieldKey: WeatherFieldKey, enabled: boolean) => {
    markDirty("天氣顯示欄位已變更，尚未儲存。");
    setWeatherSettings((current) => toggleWeatherFieldKey(current, fieldKey, enabled));
  }, [markDirty, setWeatherSettings]);

  const refreshWeather = useCallback(async () => {
    setActionState((current) => ({ ...current, isRefreshingWeather: true }));
    try {
      const response = await requestJson<WeatherHeaderContract & { diagnostic: WeatherDiagnostic }>("/api/weather/refresh", {
        method: "POST"
      });
      setWeatherPreviewContract(response);
      setWeatherDiagnostic(response.diagnostic);
      setWeatherPreviewErrorMessage("");
      const feedback = resolveWeatherRefreshFeedback(response.diagnostic);
      setMessage(feedback.message);
      setErrorMessage(feedback.errorMessage);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "手動更新天氣失敗。");
    } finally {
      await loadWeatherDiagnostic();
      setActionState((current) => ({ ...current, isRefreshingWeather: false }));
    }
  }, [loadWeatherDiagnostic, setActionState, setErrorMessage, setMessage, setWeatherDiagnostic]);

  const copyWeatherDiagnostic = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("天氣診斷已複製。");
      setErrorMessage("");
    } catch {
      setErrorMessage("無法複製天氣診斷，請手動選取內容。");
    }
  }, [setErrorMessage, setMessage]);

  return {
    copyWeatherDiagnostic,
    handleWeatherSettingChange,
    refreshWeather,
    toggleWeatherField,
    weatherOptions,
    weatherOptionsErrorMessage,
    weatherPreviewContract,
    weatherPreviewErrorMessage
  };
}
