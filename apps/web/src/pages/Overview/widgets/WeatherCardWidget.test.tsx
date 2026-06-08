import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WeatherCardWidget } from "./WeatherCardWidget";

test("WeatherCardWidget renders weather values when available", () => {
  const weather = {
    available: true,
    condition: "晴",
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

  const markup = renderToStaticMarkup(
    <WeatherCardWidget weather={weather} />
  );

  assert.match(markup, /天氣/);
  assert.match(markup, /31°C/);
  assert.match(markup, /68%/);
  assert.match(markup, /晴/);
  assert.match(markup, /風速/);
  assert.match(markup, /2.1 m\/s/);
  assert.match(markup, /雨量/);
  assert.match(markup, /0 mm/);
});

test("WeatherCardWidget renders fallback message and no null when unavailable", () => {
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

  assert.match(markup, /天氣資料/);
  assert.doesNotMatch(markup, /null/);
  assert.doesNotMatch(markup, /undefined/);
});
