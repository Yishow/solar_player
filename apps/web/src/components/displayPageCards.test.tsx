import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReferenceGlyph } from "./ReferenceGlyph";
import {
  DisplayCardFooter,
  DisplayCardFrame,
  DisplayCardHeader,
  DisplayCardValueRow
} from "./displayPageCards";
import { createDisplayCardStyleConfig } from "../pages/shared/displayCardStyleConfig";

test("display page metric-card primitives render shared frame, header, centered value row, and footer slots", () => {
  const markup = renderToStaticMarkup(
    <DisplayCardFrame className="solar-kpi-card" surface="metric">
      <DisplayCardHeader
        icon={<ReferenceGlyph name="sun" />}
        subtitle="Today's Generation"
        title="今日發電量"
      />
      <DisplayCardValueRow align="center" unit="kWh" value="3,842" />
      <DisplayCardFooter>
        <p>最後更新 2026-05-19 17:00:00</p>
      </DisplayCardFooter>
    </DisplayCardFrame>
  );

  assert.match(markup, /display-card-frame/);
  assert.match(markup, /display-card-surface-metric/);
  assert.match(markup, /display-card-header/);
  assert.match(markup, /display-card-header-icon/);
  assert.match(markup, /display-card-value-row/);
  assert.match(markup, /display-card-value-row-center/);
  assert.match(markup, /display-card-footer/);
});

test("display page info-card primitives preserve icon, body, and metadata slots", () => {
  const markup = renderToStaticMarkup(
    <DisplayCardFrame className="images-info-card" surface="info">
      <DisplayCardHeader
        icon={<ReferenceGlyph name="image" />}
        subtitle="Metadata"
        title="中廠廣場日照紀錄"
      />
      <div className="images-info-card-body">輪播中，目前素材停留 8 秒</div>
      <DisplayCardFooter>
        <small>IMG-03 · Main Plaza · 2026-05-19</small>
      </DisplayCardFooter>
    </DisplayCardFrame>
  );

  assert.match(markup, /display-card-surface-info/);
  assert.match(markup, /images-info-card-body/);
  assert.match(markup, /Metadata/);
  assert.match(markup, /IMG-03/);
});

test("display page card primitives serialize persisted style overrides into shared CSS variables", () => {
  const markup = renderToStaticMarkup(
    <DisplayCardFrame
      cardStyle={createDisplayCardStyleConfig({
        cornerRadius: 18,
        footerPaddingTop: 12,
        headerGap: 10,
        iconBoxSize: 44,
        paddingBottom: 16,
        paddingLeft: 20,
        paddingRight: 24,
        paddingTop: 14,
        subtitleFontSize: 12,
        titleFontSize: 13,
        unitFontSize: 18,
        unitPaddingBottom: 4,
        valueFontSize: 72,
        valueMarginTop: 22
      })}
      className="overview-summary"
      style={{ left: "88px" }}
      surface="info"
    >
      <DisplayCardHeader title="Shared Story Summary" />
      <p className="overview-summary-body">故事摘要狀態</p>
    </DisplayCardFrame>
  );

  assert.match(markup, /--display-card-title-size:13px/);
  assert.match(markup, /--display-card-padding:14px 24px 16px 20px/);
  assert.match(markup, /--display-card-radius:18px/);
  assert.match(markup, /--display-card-footer-padding-top:12px/);
});

test("shared display-card CSS owns the header rhythm contract and aligned pages stop redefining it", () => {
  const sharedCss = readFileSync(path.join(import.meta.dirname, "displayPageCards.css"), "utf8");
  const overviewCss = readFileSync(path.join(import.meta.dirname, "../pages/Overview/overview.css"), "utf8");
  const sustainabilityCss = readFileSync(path.join(import.meta.dirname, "../pages/Sustainability/sustainability.css"), "utf8");
  const imagesCss = readFileSync(path.join(import.meta.dirname, "../pages/Images/images.css"), "utf8");
  const solarCss = readFileSync(path.join(import.meta.dirname, "../pages/Solar/solar.css"), "utf8");

  assert.match(sharedCss, /\.display-card-header\s*\{[\s\S]*align-items:\s*flex-start;[\s\S]*gap:\s*var\(--display-card-header-gap,\s*16px\);/);
  assert.match(sharedCss, /\.display-card-surface-metric\s*\{/);
  assert.match(sharedCss, /\.display-card-surface-info\s*\{/);
  assert.match(sharedCss, /\.display-card-title\s*\{[\s\S]*font-size:\s*var\(--display-card-title-size,\s*20px\);/);
  assert.match(sharedCss, /\.display-card-subtitle\s*\{[\s\S]*margin:\s*var\(--display-card-subtitle-margin,\s*6px 0 0\);/);
  assert.match(sharedCss, /\.display-card-footer\s*\{[\s\S]*padding-top:\s*var\(--display-card-footer-padding-top,\s*18px\);/);

  assert.doesNotMatch(overviewCss, /\.overview-kpi-card\s+\.display-card-(header|title|subtitle|value-row|footer)\b/);
  assert.doesNotMatch(sustainabilityCss, /\.sustainability-(kpi|stat)-card\s+\.display-card-(header|title|subtitle|value-row|footer)\b/);
  assert.doesNotMatch(imagesCss, /\.images-info-card\s+\.display-card-(header|title|subtitle|footer)\b/);
  assert.doesNotMatch(solarCss, /\.solar-kpi-card\s+\.display-card-(header|title|subtitle|value-row|footer)\b/);
});
