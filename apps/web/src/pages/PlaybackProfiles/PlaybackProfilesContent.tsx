import { useEffect, useMemo, useRef, useState } from "react";
import type {
  DeviceGroup,
  PlaybackProfileDraft,
  PlaybackProfilePreview,
  PlaybackProfileSummary,
  PlaybackProfileVersion
} from "@solar-display/shared";
import type { DeviceFleetRow } from "../DeviceFleet/viewModel";
import {
  archivePlaybackProfile,
  createPlaybackProfile,
  getPlaybackProfileDraft,
  getPlaybackProfiles,
  getPlaybackProfileVersions,
  isPlaybackProfileDraftConflictError,
  previewPlaybackProfile,
  publishPlaybackProfile,
  renamePlaybackProfile,
  rollbackPlaybackProfile,
  savePlaybackProfileDraft
} from "../../services/api";
import {
  buildProfilePublishConfirmation,
  createProfileRequestGuard,
  isProfileDraftDirty,
  validateProfileDraftForPublish
} from "./viewModel";
import { ProfileDraftSettingsSection } from "./ProfileDraftSettingsSection";
import { ProfileListSidebar } from "./ProfileListSidebar";
import { ProfilePagesSection } from "./ProfilePagesSection";
import { ProfileVersionHistorySection } from "./ProfileVersionHistorySection";

export type PlaybackProfilesLoaderData = {
  loadError: string;
  profiles: PlaybackProfileSummary[];
};

const defaultProfileApi = {
  archivePlaybackProfile,
  createPlaybackProfile,
  getPlaybackProfileDraft,
  getPlaybackProfiles,
  getPlaybackProfileVersions,
  previewPlaybackProfile,
  publishPlaybackProfile,
  renamePlaybackProfile,
  rollbackPlaybackProfile,
  savePlaybackProfileDraft
};

export function PlaybackProfilesContent({
  devices = [],
  groups = [],
  loaderData,
  profileApi = defaultProfileApi
}: {
  devices?: DeviceFleetRow[];
  groups?: DeviceGroup[];
  loaderData: PlaybackProfilesLoaderData;
  profileApi?: typeof defaultProfileApi;
}) {
  const initialProfileId =
    loaderData.profiles.find((profile) => !profile.archivedAt)?.id ?? null;
  const [profiles, setProfiles] = useState<PlaybackProfileSummary[]>(
    loaderData.profiles
  );
  const [selectedId, setSelectedId] = useState<number | null>(initialProfileId);
  const [draft, setDraft] = useState<PlaybackProfileDraft | null>(null);
  const [persistedDraft, setPersistedDraft] =
    useState<PlaybackProfileDraft | null>(null);
  const [versions, setVersions] = useState<PlaybackProfileVersion[]>([]);
  const [preview, setPreview] = useState<PlaybackProfilePreview | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(loaderData.loadError);
  const requestGuard = useRef(createProfileRequestGuard());
  const selected = profiles.find((profile) => profile.id === selectedId) ?? null;

  const refreshProfiles = async (preferredId?: number) => {
    const next = await profileApi.getPlaybackProfiles();
    setProfiles(next);
    setSelectedId((current) => {
      if (preferredId && next.some((profile) => profile.id === preferredId)) {
        return preferredId;
      }
      if (current && next.some((profile) => profile.id === current)) {
        return current;
      }
      return next.find((profile) => !profile.archivedAt)?.id ?? null;
    });
  };

  const refreshSelected = async (
    profileId: number,
    requestGeneration = requestGuard.current.begin()
  ) => {
    const [nextDraft, nextVersions] = await Promise.all([
      profileApi.getPlaybackProfileDraft(profileId),
      profileApi.getPlaybackProfileVersions(profileId)
    ]);
    if (!requestGuard.current.isCurrent(requestGeneration)) {
      return false;
    }
    setDraft(nextDraft);
    setPersistedDraft(nextDraft);
    setVersions(nextVersions);
    setPreview(null);
    return true;
  };

  useEffect(() => {
    const requestGeneration = requestGuard.current.begin();
    if (selectedId === null) {
      setDraft(null);
      setPersistedDraft(null);
      return;
    }
    setDraft(null);
    setPersistedDraft(null);
    setVersions([]);
    setPreview(null);
    void refreshSelected(selectedId, requestGeneration).catch((error) => {
      if (requestGuard.current.isCurrent(requestGeneration)) {
        setMessage(error instanceof Error ? error.message : String(error));
      }
    });
  }, [selectedId]);

  const validation = useMemo(
    () => (draft ? validateProfileDraftForPublish(draft) : null),
    [draft]
  );
  const dirty = useMemo(
    () => isProfileDraftDirty(draft, persistedDraft),
    [draft, persistedDraft]
  );

  const mutate = async (action: () => Promise<void>) => {
    setPending(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      if (isPlaybackProfileDraftConflictError(error) && selectedId !== null) {
        setMessage(`Draft 已更新至 revision ${error.currentRevision}，已重新載入。`);
        await refreshSelected(selectedId);
      } else {
        setMessage(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setPending(false);
    }
  };

  const handleCreateProfile = () => {
    const name = window.prompt("新 Playback Profile 名稱");
    if (!name?.trim()) return;
    void mutate(async () => {
      const created = await profileApi.createPlaybackProfile(name.trim());
      await refreshProfiles(created.id);
    });
  };

  const handleRenameProfile = () => {
    if (!selected) return;
    const name = window.prompt("Profile 名稱", selected.name);
    if (!name?.trim()) return;
    void mutate(async () => {
      await profileApi.renamePlaybackProfile(selected.id, name.trim());
      await refreshProfiles(selected.id);
    });
  };

  const handleArchiveProfile = () => {
    if (!selected || selected.isDefault) return;
    if (!window.confirm(`確定封存「${selected.name}」？`)) return;
    void mutate(async () => {
      await profileApi.archivePlaybackProfile(selected.id);
      await refreshProfiles();
    });
  };

  const handleSaveDraft = () => {
    if (!selected || !draft) return;
    void mutate(async () => {
      const saved = await profileApi.savePlaybackProfileDraft(selected.id, {
        expectedRevision: draft.revision,
        pages: draft.pages,
        settings: draft.settings
      });
      setDraft(saved);
      setPersistedDraft(saved);
      setPreview(null);
      setMessage("Draft 已儲存。");
    });
  };

  const handlePreview = () => {
    if (!selected) return;
    void mutate(async () => {
      setPreview(await profileApi.previewPlaybackProfile(selected.id));
    });
  };

  const handlePublish = () => {
    if (!selected || !draft) return;
    const nextVersion = (versions.at(-1)?.versionNumber ?? 0) + 1;
    if (!window.confirm(buildProfilePublishConfirmation(selected.name, nextVersion))) return;
    void mutate(async () => {
      await profileApi.publishPlaybackProfile(selected.id, draft.revision);
      await refreshSelected(selected.id);
      setMessage(`Version ${nextVersion} 已發布。`);
    });
  };

  const handleRollback = (version: PlaybackProfileVersion) => {
    if (!selected) return;
    if (!window.confirm(`確定以 Version ${version.versionNumber} 建立新的 rollback Version？`)) return;
    void mutate(async () => {
      await profileApi.rollbackPlaybackProfile(selected.id, version.id);
      await refreshSelected(selected.id);
    });
  };

  return (
    <main className="playback-profiles-page">
      <header className="playback-profiles-page__header">
        <div>
          <p className="playback-profiles-page__kicker">PLAYBACK POLICY GOVERNANCE</p>
          <h1>播放策略<em>版本治理</em></h1>
          <p className="playback-profiles-page__desc">
            維護 Draft 草稿、預覽 CL／KN 廠區現場畫面，並受控發布不可變版本或隨時秒級 Rollback。
          </p>
        </div>
        <button
          className="device-fleet-btn-primary"
          disabled={pending}
          onClick={handleCreateProfile}
          type="button"
        >
          ＋ 新增 Profile
        </button>
      </header>

      {message && <p className="playback-profiles-message" role="status">{message}</p>}

      <div className="playback-profiles-layout">
        <ProfileListSidebar
          groups={groups}
          onCreateProfile={handleCreateProfile}
          onSelectProfile={setSelectedId}
          pending={pending}
          profiles={profiles}
          selectedId={selectedId}
        />

        <section className="playback-profiles-workspace">
          {!selected || !draft ? (
            <div className="playback-profiles-empty-state">
              <p>載入 Profile Draft 中…</p>
            </div>
          ) : (
            <>
              <div className="playback-profiles-toolbar">
                <div className="playback-profiles-toolbar__info">
                  <h2>{selected.name}</h2>
                  {groups.length > 0 && (
                    <div className="playback-profiles-impact">
                      {groups.filter((g) => g.playbackProfileId === selectedId).length > 0 ? (
                        <span
                          className="playback-profiles-impact-pill"
                          title={`套用群組：${groups
                            .filter((g) => g.playbackProfileId === selectedId)
                            .map((g) => g.name)
                            .join(", ")}`}
                        >
                          ● 套用於{" "}
                          {groups.filter((g) => g.playbackProfileId === selectedId).length}{" "}
                          個群組（
                          {devices.filter((d) => d.playbackProfileId === selectedId).length}{" "}
                          台機台）
                        </span>
                      ) : (
                        <span className="playback-profiles-impact-pill is-unbound">
                          ○ 尚未指派給任何群組
                        </span>
                      )}
                    </div>
                  )}
                  <small className="playback-profiles-toolbar__rev">
                    Draft revision {draft.revision}
                  </small>
                </div>
                <div className="playback-profiles-toolbar__actions">
                  <button
                    className="device-fleet-btn-action"
                    disabled={pending}
                    onClick={handleRenameProfile}
                    type="button"
                  >
                    重新命名
                  </button>
                  {!selected.isDefault && (
                    <button
                      className="device-fleet-btn-action is-danger"
                      disabled={pending}
                      onClick={handleArchiveProfile}
                      type="button"
                    >
                      封存
                    </button>
                  )}
                </div>
              </div>

              <ProfileDraftSettingsSection
                draft={draft}
                onDraftChange={setDraft}
              />

              <ProfilePagesSection
                draft={draft}
                onDraftChange={setDraft}
              />

              <ProfileVersionHistorySection
                dirty={dirty}
                onPreview={handlePreview}
                onPublish={handlePublish}
                onRollback={handleRollback}
                onSaveDraft={handleSaveDraft}
                pending={pending}
                preview={preview}
                validation={validation}
                versions={versions}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
