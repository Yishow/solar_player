import type { PlaybackProfilePreview } from "@solar-display/shared";
import { buildSitePreviewSummary } from "./viewModel";

export function PlaybackProfilePreviewPanel({
  preview
}: {
  preview: PlaybackProfilePreview;
}) {
  return (
    <section className="playback-profiles-preview">
      {(["cl", "kn"] as const).map((site) => {
        const sitePreview = preview[site];
        const summary = buildSitePreviewSummary(sitePreview);
        return (
          <article key={site}>
            <h3>{site.toUpperCase()} Preview</h3>
            <p>
              設定 {summary.configured} · 有效 {summary.effective}
              {" "}· 跳過 {summary.skipped} · 診斷 {summary.diagnostics}
            </p>
            <ul>
              {sitePreview.effective.map((page) => (
                <li key={`effective-${page.id}`}>有效：{page.labelZh}</li>
              ))}
              {sitePreview.skipped.map((page) => (
                <li key={`skipped-${page.id}`}>
                  跳過：{page.labelZh} · {page.skipReason}
                  {page.detail ? ` · ${page.detail}` : ""}
                </li>
              ))}
            </ul>
            {Object.entries(sitePreview.diagnostics).map(
              ([kind, entries]) => entries.length > 0 && (
                <div key={kind}>
                  <strong>{kind}</strong>
                  <ul>
                    {entries.map((entry) => <li key={entry}>{entry}</li>)}
                  </ul>
                </div>
              )
            )}
          </article>
        );
      })}
    </section>
  );
}
