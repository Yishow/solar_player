import { useEffect, useMemo, useRef, useState } from "react";
import type {
  PlaybackProfileDraft,
  PlaybackProfilePreview,
  PlaybackProfileSummary,
  PlaybackProfileVersion
} from "@solar-display/shared";
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
import { PlaybackProfilePreviewPanel } from "./PlaybackProfilePreviewPanel";
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
  loaderData,
  profileApi = defaultProfileApi
}: {
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
    () => draft ? validateProfileDraftForPublish(draft) : null,
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

  return (
    <main className="playback-profiles-page">
      <header className="playback-profiles-page__header">
        <div>
          <small>PROFILE GOVERNANCE</small>
          <h1>播放策略版本治理</h1>
          <p>先編輯 Draft、同時預覽 CL／KN，再建立不可變更的版本。</p>
        </div>
        <button
          disabled={pending}
          onClick={() => {
            const name = window.prompt("新 Playback Profile 名稱");
            if (!name?.trim()) return;
            void mutate(async () => {
              const profile = await profileApi.createPlaybackProfile(name.trim());
              await refreshProfiles(profile.id);
            });
          }}
        >
          新增 Profile
        </button>
      </header>

      {message && <p className="playback-profiles-message" role="status">{message}</p>}

      <div className="playback-profiles-layout">
        <aside aria-label="Playback Profiles">
          {profiles.map((profile) => (
            <button
              className={profile.id === selectedId ? "is-selected" : ""}
              disabled={pending || Boolean(profile.archivedAt)}
              key={profile.id}
              onClick={() => setSelectedId(profile.id)}
            >
              <strong>{profile.name}</strong>
              <small>
                {profile.isDefault ? "Default" : "Reusable"}
                {profile.archivedAt ? " · 已封存" : ""}
              </small>
            </button>
          ))}
        </aside>

        <section className="playback-profiles-workspace">
          {!selected || !draft ? (
            <p>載入 Profile Draft…</p>
          ) : (
            <>
              <div className="playback-profiles-toolbar">
                <div>
                  <h2>{selected.name}</h2>
                  <small>Draft revision {draft.revision}</small>
                </div>
                <div>
                  <button
                    disabled={pending}
                    onClick={() => {
                      const name = window.prompt("Profile 名稱", selected.name);
                      if (!name?.trim()) return;
                      void mutate(async () => {
                        await profileApi.renamePlaybackProfile(selected.id, name.trim());
                        await refreshProfiles(selected.id);
                      });
                    }}
                  >
                    重新命名
                  </button>
                  {!selected.isDefault && (
                    <button
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm(`確定封存「${selected.name}」？`)) return;
                        void mutate(async () => {
                          await profileApi.archivePlaybackProfile(selected.id);
                          await refreshProfiles();
                        });
                      }}
                    >
                      封存
                    </button>
                  )}
                </div>
              </div>

              <section className="playback-profiles-settings">
                <h3>Draft 行為</h3>
                <label>
                  起始頁面
                  <select
                    value={draft.settings.startPage}
                    onChange={(event) => setDraft({
                      ...draft,
                      settings: {
                        ...draft.settings,
                        startPage: Number(event.target.value)
                      }
                    })}
                  >
                    {draft.pages.filter((page) => page.enabled).map((page) => (
                      <option key={page.id} value={page.id}>{page.labelZh}</option>
                    ))}
                  </select>
                </label>
                <label>
                  亮度
                  <input
                    max="100"
                    min="1"
                    type="number"
                    value={draft.settings.brightness}
                    onChange={(event) => setDraft({
                      ...draft,
                      settings: {
                        ...draft.settings,
                        brightness: Number(event.target.value)
                      }
                    })}
                  />
                </label>
                <label>
                  <input
                    checked={draft.settings.autoplay}
                    type="checkbox"
                    onChange={(event) => setDraft({
                      ...draft,
                      settings: { ...draft.settings, autoplay: event.target.checked }
                    })}
                  />
                  自動播放
                </label>
                <label>
                  <input
                    checked={draft.settings.loop}
                    type="checkbox"
                    onChange={(event) => setDraft({
                      ...draft,
                      settings: { ...draft.settings, loop: event.target.checked }
                    })}
                  />
                  循環播放
                </label>
                <label>
                  <input
                    checked={draft.settings.scheduleEnabled}
                    type="checkbox"
                    onChange={(event) => setDraft({
                      ...draft,
                      settings: {
                        ...draft.settings,
                        scheduleEnabled: event.target.checked
                      }
                    })}
                  />
                  啟用排程
                </label>
                <label>
                  開始時間
                  <input
                    type="time"
                    value={draft.settings.scheduleStart ?? ""}
                    onChange={(event) => setDraft({
                      ...draft,
                      settings: {
                        ...draft.settings,
                        scheduleStart: event.target.value || null
                      }
                    })}
                  />
                </label>
                <label>
                  結束時間
                  <input
                    type="time"
                    value={draft.settings.scheduleEnd ?? ""}
                    onChange={(event) => setDraft({
                      ...draft,
                      settings: {
                        ...draft.settings,
                        scheduleEnd: event.target.value || null
                      }
                    })}
                  />
                </label>
                <label>
                  轉場
                  <select
                    value={draft.settings.transitionType}
                    onChange={(event) => setDraft({
                      ...draft,
                      settings: {
                        ...draft.settings,
                        transitionType: event.target.value as
                          PlaybackProfileDraft["settings"]["transitionType"]
                      }
                    })}
                  >
                    <option value="fade">淡入淡出</option>
                    <option value="slide">滑動</option>
                    <option value="none">無</option>
                  </select>
                </label>
                <label>
                  轉場毫秒
                  <input
                    min="0"
                    type="number"
                    value={draft.settings.transitionSpeed}
                    onChange={(event) => setDraft({
                      ...draft,
                      settings: {
                        ...draft.settings,
                        transitionSpeed: Number(event.target.value)
                      }
                    })}
                  />
                </label>
                <label>
                  待機模式
                  <select
                    value={draft.settings.idleMode}
                    onChange={(event) => setDraft({
                      ...draft,
                      settings: {
                        ...draft.settings,
                        idleMode: event.target.value as
                          PlaybackProfileDraft["settings"]["idleMode"]
                      }
                    })}
                  >
                    <option value="disabled">停用</option>
                    <option value="return-to-start">回到起始頁</option>
                  </select>
                </label>
                <label>
                  待機秒數
                  <input
                    min="1"
                    type="number"
                    value={draft.settings.idleTimeout}
                    onChange={(event) => setDraft({
                      ...draft,
                      settings: {
                        ...draft.settings,
                        idleTimeout: Number(event.target.value)
                      }
                    })}
                  />
                </label>
                <label>
                  方向
                  <select
                    value={draft.settings.orientation}
                    onChange={(event) => setDraft({
                      ...draft,
                      settings: {
                        ...draft.settings,
                        orientation: event.target.value as
                          PlaybackProfileDraft["settings"]["orientation"]
                      }
                    })}
                  >
                    <option value="landscape">橫向</option>
                    <option value="portrait">直向</option>
                  </select>
                </label>
                <fieldset>
                  <legend>重複星期</legend>
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <label key={day}>
                      <input
                        checked={draft.settings.repeatDays.includes(day)}
                        type="checkbox"
                        onChange={(event) => setDraft({
                          ...draft,
                          settings: {
                            ...draft.settings,
                            repeatDays: event.target.checked
                              ? [...draft.settings.repeatDays, day].sort()
                              : draft.settings.repeatDays.filter(
                                  (candidate) => candidate !== day
                                )
                          }
                        })}
                      />
                      {["日", "一", "二", "三", "四", "五", "六"][day]}
                    </label>
                  ))}
                </fieldset>
              </section>

              <section>
                <h3>頁面順序與時間</h3>
                <div className="playback-profiles-pages">
                  {draft.pages.map((page, index) => (
                    <article key={page.id}>
                      <label>
                        <input
                          checked={page.enabled}
                          type="checkbox"
                          onChange={(event) => setDraft({
                            ...draft,
                            pages: draft.pages.map((candidate) =>
                              candidate.id === page.id
                                ? { ...candidate, enabled: event.target.checked }
                                : candidate
                            )
                          })}
                        />
                        {page.labelZh}
                      </label>
                      <input
                        aria-label={`${page.labelZh} 秒數`}
                        min="1"
                        type="number"
                        value={page.durationSeconds}
                        onChange={(event) => setDraft({
                          ...draft,
                          pages: draft.pages.map((candidate) =>
                            candidate.id === page.id
                              ? {
                                  ...candidate,
                                  durationSeconds: Number(event.target.value)
                                }
                              : candidate
                          )
                        })}
                      />
                      <button
                        disabled={index === 0}
                        onClick={() => {
                          const pages = [...draft.pages];
                          [pages[index - 1], pages[index]] = [pages[index]!, pages[index - 1]!];
                          setDraft({
                            ...draft,
                            pages: pages.map((candidate, order) => ({
                              ...candidate,
                              displayOrder: order + 1
                            }))
                          });
                        }}
                      >
                        上移
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              <div className="playback-profiles-actions">
                <button
                  disabled={pending}
                  onClick={() => void mutate(async () => {
                    const saved = await profileApi.savePlaybackProfileDraft(selected.id, {
                      expectedRevision: draft.revision,
                      pages: draft.pages,
                      settings: draft.settings
                    });
                    setDraft(saved);
                    setPersistedDraft(saved);
                    setPreview(null);
                    setMessage("Draft 已儲存。");
                  })}
                >
                  儲存 Draft
                </button>
                <button
                  disabled={pending || dirty}
                  title={dirty ? "請先儲存 Draft 再預覽。" : ""}
                  onClick={() => void mutate(async () => {
                    setPreview(await profileApi.previewPlaybackProfile(selected.id));
                  })}
                >
                  預覽 CL／KN
                </button>
                <button
                  disabled={pending || dirty || validation !== null}
                  title={dirty ? "請先儲存 Draft 再發布。" : validation ?? ""}
                  onClick={() => {
                    const nextVersion = (versions.at(-1)?.versionNumber ?? 0) + 1;
                    if (!window.confirm(
                      buildProfilePublishConfirmation(selected.name, nextVersion)
                    )) return;
                    void mutate(async () => {
                      await profileApi.publishPlaybackProfile(selected.id, draft.revision);
                      await refreshSelected(selected.id);
                      setMessage(`Version ${nextVersion} 已發布。`);
                    });
                  }}
                >
                  發布 Version
                </button>
              </div>
              {dirty && (
                <p className="playback-profiles-validation">
                  尚有未儲存變更；請先儲存 Draft，再執行預覽或發布。
                </p>
              )}
              {validation && <p className="playback-profiles-validation">{validation}</p>}

              {preview && <PlaybackProfilePreviewPanel preview={preview} />}

              <section>
                <h3>版本歷史</h3>
                <div className="playback-profiles-versions">
                  {versions.length === 0 && <p>尚未發布版本。</p>}
                  {[...versions].reverse().map((version) => (
                    <article key={version.id}>
                      <div>
                        <strong>Version {version.versionNumber}</strong>
                        <small>{version.createdBy} · {version.createdAt}</small>
                      </div>
                      <button
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm(
                            `確定以 Version ${version.versionNumber} 建立新的 rollback Version？`
                          )) return;
                          void mutate(async () => {
                            await profileApi.rollbackPlaybackProfile(
                              selected.id,
                              version.id
                            );
                            await refreshSelected(selected.id);
                          });
                        }}
                      >
                        Rollback
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
