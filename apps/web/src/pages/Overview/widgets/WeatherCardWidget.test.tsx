import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WeatherCardWidget } from "./WeatherCardWidget";

test("WeatherCardWidget renders weather values when available", () => {
  const markup = renderToStaticMarkup(
    <WeatherCardWidget
      weather={{
        available: true,
        condition: "晴",
        humidity: "68%",
        location: "豐原",
        observedAt: "2026-05-13T10:00:00.000Z",
        temperature: "31°C"
      }}
    />
  );

  assert.match(markup, /天氣/);
  assert.match(markup, /31°C/);
  assert.match(markup, /68%/);
  assert.match(markup, /晴/);
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
        temperature: "--"
      }}
    />
  );

  assert.match(markup, /天氣資料/);
  assert.doesNotMatch(markup, /null/);
  assert.doesNotMatch(markup, /undefined/);
});
