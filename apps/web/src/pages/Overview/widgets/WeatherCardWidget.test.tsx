import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WeatherCardWidget } from "./WeatherCardWidget";

const baseWeather = {
  available: true,
  humidity: "68%",
  location: "豐原",
  observedAt: "2026-05-13T10:00:00.000Z",
  precipitation: "0 mm",
  temperature: "31°C",
  windSpeed: "2.1 m/s"
} as Parameters<typeof WeatherCardWidget>[0]["weather"] & {
  precipitation: string;
  windSpeed: string;
};

test("WeatherCardWidget renders weather values when available", () => {
  const weather = { ...baseWeather, condition: "晴" };

  const markup = renderToStaticMarkup(
    <WeatherCardWidget weather={weather} />
  );

  assert.match(markup, /天氣/);
  assert.match(markup, /31/);
  assert.match(markup, /°C/);
  assert.match(markup, /68%/);
  assert.match(markup, /晴/);
  assert.match(markup, /風速/);
  assert.match(markup, /2.1 m\/s/);
  assert.match(markup, /雨量/);
  assert.match(markup, /0 mm/);

  // Assert emojis are replaced by SVGs
  assert.doesNotMatch(markup, /💧/);
  assert.doesNotMatch(markup, /💨/);
  assert.doesNotMatch(markup, /🌧️/);
  assert.match(markup, /overview-weather-indicator-icon/);

  // Condition badge and live meta line
  assert.match(markup, /overview-weather-condition-badge/);
  assert.match(markup, /overview-weather-meta-line/);
  assert.match(markup, /overview-weather-live-dot/);
  assert.match(markup, /豐原/);
  assert.match(markup, /weather-sunny/);
});

test("WeatherCardWidget renders correct responsive theme classes based on weather conditions", () => {
  const rainyMarkup = renderToStaticMarkup(
    <WeatherCardWidget weather={{ ...baseWeather, condition: "下雨" }} />
  );
  assert.match(rainyMarkup, /weather-rainy/);
  assert.match(rainyMarkup, /overview-weather-icon-rainy/);

  const cloudyMarkup = renderToStaticMarkup(
    <WeatherCardWidget weather={{ ...baseWeather, condition: "多雲" }} />
  );
  assert.match(cloudyMarkup, /weather-cloudy/);
  assert.match(cloudyMarkup, /overview-weather-icon-cloudy/);

  const stormyMarkup = renderToStaticMarkup(
    <WeatherCardWidget weather={{ ...baseWeather, condition: "雷陣雨" }} />
  );
  assert.match(stormyMarkup, /weather-stormy/);
  assert.match(stormyMarkup, /overview-weather-icon-stormy/);

  const snowyMarkup = renderToStaticMarkup(
    <WeatherCardWidget weather={{ ...baseWeather, condition: "下雪" }} />
  );
  assert.match(snowyMarkup, /weather-snowy/);
  assert.match(snowyMarkup, /overview-weather-icon-snowy/);

  const foggyMarkup = renderToStaticMarkup(
    <WeatherCardWidget weather={{ ...baseWeather, condition: "起霧" }} />
  );
  assert.match(foggyMarkup, /weather-foggy/);
  assert.match(foggyMarkup, /overview-weather-icon-foggy/);
});

test("WeatherCardWidget respects manual theme configuration over active condition", () => {
  const markup = renderToStaticMarkup(
    <WeatherCardWidget
      weather={{ ...baseWeather, condition: "晴" }}
      themeMode="manual"
      manualTheme="weather-rainy"
    />
  );

  assert.match(markup, /weather-rainy/);
  assert.doesNotMatch(markup, /weather-sunny/);
});

test("WeatherCardWidget renders skeleton loader and no null when unavailable", () => {
  const markup = renderToStaticMarkup(
    <WeatherCardWidget
      weather={{
        available: false,
        condition: "--",
        humidity: "--",
        location: "",
        observedAt: "",
        precipitation: "--",
        temperature: "--",
        windSpeed: "--"
      }}
    />
  );

  assert.match(markup, /overview-weather-skeleton/);
  assert.doesNotMatch(markup, /null/);
  assert.doesNotMatch(markup, /undefined/);
});

test("WeatherCardWidget SVG gradients use instance-scoped ids to avoid collisions", () => {
  // Render two instances simultaneously — gradient ids must differ
  const markup = renderToStaticMarkup(
    <>
      <WeatherCardWidget weather={{ ...baseWeather, condition: "晴" }} />
      <WeatherCardWidget weather={{ ...baseWeather, condition: "大雨" }} />
    </>
  );

  // Each instance gets a unique prefix in gradient ids (e.g. w-1-, w-2-)
  const gradIds = markup.match(/id="w-\d+-[^"]+-grad"/g) ?? [];
  assert.ok(gradIds.length >= 3, "Expected at least 3 gradient ids across two instances");

  // All ids should be unique
  const uniqueIds = new Set(gradIds);
  assert.equal(uniqueIds.size, gradIds.length, "All gradient ids must be unique across instances");
});
