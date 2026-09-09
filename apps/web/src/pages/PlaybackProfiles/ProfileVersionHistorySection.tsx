import type {
  PlaybackProfilePreview,
  PlaybackProfileVersion
} from "@solar-display/shared";
import { OpsSurface, OpsSurfaceTitle } from "../../components/management";
import { PlaybackProfilePreviewPanel } from "./PlaybackProfilePreviewPanel";

export type ProfileVersionHistorySectionProps = {
  dirty: boolean;
  onPreview: () => void;
  onPublish: () => void;
  onRollback: (version: PlaybackProfileVersion) => void;
  onSaveDraft: () => void;
  pending: boolean;
  preview: PlaybackProfilePreview | null;
  validation: string | null;
  versions: PlaybackProfileVersion[];
};

export function ProfileVersionHistorySection({
  dirty,
  onPreview,
  onPublish,
  onRollback,
  onSaveDraft,
  pending,
  preview,
  validation,
  versions
}: ProfileVersionHistorySectionProps) {
  return (
    <>
      <OpsSurface family="operations">
        <OpsSurfaceTitle
          caption="儲存草稿、模擬 CL／KN 現場畫面，並受控發布為不可變正式版本"
          title="發布控制"
        />
        <div className="playback-profiles-actions">
          <button
            className="device-fleet-btn-action"
            disabled={pending}
            onClick={onSaveDraft}
            type="button"
          >
            儲存 Draft
          </button>
          <button
            className="device-fleet-btn-action"
            disabled={pending || dirty}
            onClick={onPreview}
            title={dirty ? "請先儲存 Draft 再預覽。" : ""}
            type="button"
          >
            預覽 CL／KN
          </button>
          <button
            className="device-fleet-btn-primary"
            disabled={pending || dirty || validation !== null}
            onClick={onPublish}
            title={dirty ? "請先儲存 Draft 再發布。" : validation ?? ""}
            type="button"
          >
            發布 Version
          </button>
        </div>

        {dirty && (
          <p className="playback-profiles-validation">
            尚有未儲存變更；請先儲存 Draft，再執行預覽或發布。
          </p>
        )}
        {validation && (
          <p className="playback-profiles-validation">{validation}</p>
        )}
      </OpsSurface>

      {preview && <PlaybackProfilePreviewPanel preview={preview} />}

      <OpsSurface family="operations">
        <OpsSurfaceTitle
          caption="所有已發布之不可變版本歷史；發生異常時可秒級一鍵 Rollback 線性回滾"
          title="版本歷史"
        />
        <div className="playback-profiles-versions">
          {versions.length === 0 ? (
            <p className="profile-versions-empty">尚未發布版本。</p>
          ) : (
            [...versions].reverse().map((version) => (
              <article className="profile-version-item" key={version.id}>
                <div className="profile-version-item__meta">
                  <strong className="profile-version-item__tag">
                    Version {version.versionNumber}
                  </strong>
                  <small className="profile-version-item__details">
                    由 {version.createdBy} 於 {version.createdAt} 發布
                  </small>
                </div>
                <button
                  className="device-fleet-btn-action is-danger"
                  disabled={pending}
                  onClick={() => onRollback(version)}
                  type="button"
                >
                  回滾 (Rollback)
                </button>
              </article>
            ))
          )}
        </div>
      </OpsSurface>
    </>
  );
}
