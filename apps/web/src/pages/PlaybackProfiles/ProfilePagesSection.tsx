import type { PlaybackProfileDraft } from "@solar-display/shared";
import { OpsSurface, OpsSurfaceTitle } from "../../components/management";

export type ProfilePagesSectionProps = {
  draft: PlaybackProfileDraft;
  onDraftChange: (nextDraft: PlaybackProfileDraft) => void;
};

export function ProfilePagesSection({
  draft,
  onDraftChange
}: ProfilePagesSectionProps) {
  const togglePageEnabled = (pageId: number, enabled: boolean) => {
    onDraftChange({
      ...draft,
      pages: draft.pages.map((candidate) =>
        candidate.id === pageId ? { ...candidate, enabled } : candidate
      )
    });
  };

  const updatePageDuration = (pageId: number, durationSeconds: number) => {
    onDraftChange({
      ...draft,
      pages: draft.pages.map((candidate) =>
        candidate.id === pageId
          ? { ...candidate, durationSeconds }
          : candidate
      )
    });
  };

  const movePageUp = (index: number) => {
    if (index <= 0) return;
    const pages = [...draft.pages];
    [pages[index - 1], pages[index]] = [pages[index]!, pages[index - 1]!];
    onDraftChange({
      ...draft,
      pages: pages.map((candidate, order) => ({
        ...candidate,
        displayOrder: order + 1
      }))
    });
  };

  const enabledCount = draft.pages.filter((p) => p.enabled).length;

  return (
    <OpsSurface family="operations">
      <OpsSurfaceTitle
        caption={`勾選參與輪播之頁面（已啟用 ${enabledCount} / ${draft.pages.length} 頁），並設定每頁停留秒數與先後順序`}
        title="頁面順序與時間"
      />
      <div className="playback-profiles-pages">
        {draft.pages.map((page, index) => (
          <article
            className={`profile-page-item ${!page.enabled ? "is-disabled" : ""}`}
            key={page.id}
          >
            <label className="profile-page-item__label">
              <input
                checked={page.enabled}
                onChange={(event) =>
                  togglePageEnabled(page.id, event.target.checked)
                }
                type="checkbox"
              />
              <span className="profile-page-item__title">{page.labelZh}</span>
              <small className="profile-page-item__route">{page.route}</small>
            </label>

            <div className="profile-page-item__controls">
              <div className="profile-page-duration-wrap">
                <input
                  aria-label={`${page.labelZh} 秒數`}
                  className="mgmt-input profile-page-duration-input"
                  min="1"
                  onChange={(event) =>
                    updatePageDuration(page.id, Number(event.target.value))
                  }
                  type="number"
                  value={page.durationSeconds}
                />
                <span className="profile-page-duration-unit">秒</span>
              </div>

              <button
                className="device-fleet-btn-action"
                disabled={index === 0}
                onClick={() => movePageUp(index)}
                type="button"
              >
                ▲ 上移
              </button>
            </div>
          </article>
        ))}
      </div>
    </OpsSurface>
  );
}
