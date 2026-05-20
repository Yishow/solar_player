import type {
  DisplayPageInstance,
  DisplayRotationPreview,
  PlaybackPage,
  PlaybackSettings
} from "@solar-display/shared";
import { useEffect, useMemo, useState } from "react";
import { RemoteSyncBanner } from "../../components/management/RemoteSyncBanner";
import {
  hasDisplaySyncDraftChanges,
  useDisplaySyncDraftGuard
} from "../../hooks/displaySyncDraftGuard";
import { useDisplayOpsSummary } from "../../hooks/useDisplayOpsSummary";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import {
  archiveDisplayPageRegistryPage,
  createDisplayPageRegistryPage,
  getDisplayPageRegistry,
  getDisplayRotationPreview,
  getPlaybackPages,
  getPlaybackSettings,
  updatePlaybackPages,
  updatePlaybackSettings
} from "../../services/api";
import { Switch } from "../../components/management";
import "./playbackSettings.css";
import { buildPlaybackSettingsViewModel, reorderPlaybackPages } from "./viewModel";
import { PlaybackSettingsFormSections } from "./PlaybackSettingsFormSections";
import { LiveRotationPreviewList } from "./LiveRotationPreviewList";
import { useLiveDisplayPagePreviewCatalog } from "../shared/useLiveDisplayPagePreviewCatalog";

export function PlaybackSettings() {
  const livePreviewCatalog = useLiveDisplayPagePreviewCatalog();
  const [settings, setSettings] = useState<PlaybackSettings | null>(null);
  const [lastSyncedSettings, setLastSyncedSettings] = useState<PlaybackSettings | null>(null);
  const [pages, setPages] = useState<PlaybackPage[]>([]);
  const [lastSyncedPages, setLastSyncedPages] = useState<PlaybackPage[]>([]);
  const [registryPages, setRegistryPages] = useState<DisplayPageInstance[]>([]);
  const [rotationPreview, setRotationPreview] = useState<DisplayRotationPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistrySaving, setIsRegistrySaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("正在同步播放設定...");
  const [errorMessage, setErrorMessage] = useState("");
  const [showAddPageForm, setShowAddPageForm] = useState(false);
  const {
    errorMessage: displayOpsErrorMessage,
    reload: reloadDisplayOpsSummary,
    summary: displayOpsSummary
  } = useDisplayOpsSummary();

  const applyLoadedPlaybackConfig = (
    nextSettings: PlaybackSettings,
    nextPages: PlaybackPage[],
    nextRotationPreview: DisplayRotationPreview,
    nextRegistryPages: DisplayPageInstance[]
  ) => {
    setSettings(nextSettings);
    setLastSyncedSettings(nextSettings);
    setPages(nextPages);
    setLastSyncedPages(nextPages);
    setRotationPreview(nextRotationPreview);
    setRegistryPages(nextRegistryPages);
  };

  const loadPlaybackConfig = async () => {
    const [nextSettings, nextPages, nextRotationPreview, nextRegistryPages] = await Promise.all([
      getPlaybackSettings(),
      getPlaybackPages(),
      getDisplayRotationPreview(),
      getDisplayPageRegistry()
    ]);

    return {
      nextPages,
      nextRegistryPages,
      nextRotationPreview,
      nextSettings
    };
  };

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      setIsLoading(true);
      try {
        const {
          nextPages,
          nextRegistryPages,
          nextRotationPreview,
          nextSettings
        } = await loadPlaybackConfig();
        if (!active) return;
        applyLoadedPlaybackConfig(nextSettings, nextPages, nextRotationPreview, nextRegistryPages);
        setMessage("播放設定已同步。");
        setErrorMessage("");
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "載入播放設定失敗。");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const markDirty = () => {
    setMessage("設定已變更，尚未儲存。");
    setErrorMessage("");
  };

  const updateSettingsField = <Key extends keyof PlaybackSettings>(
    key: Key,
    value: PlaybackSettings[Key]
  ) => {
    markDirty();
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const [savedSettings, savedPages] = await Promise.all([
        updatePlaybackSettings(settings),
        updatePlaybackPages(
          pages.map((page) => ({
            displayOrder: page.displayOrder,
            durationSeconds: page.durationSeconds,
            enabled: page.enabled,
            id: page.id
          }))
        )
      ]);
      const nextRotationPreview = await getDisplayRotationPreview();
      await reloadDisplayOpsSummary();
      setSettings(savedSettings);
      setLastSyncedSettings(savedSettings);
      setPages(savedPages);
      setLastSyncedPages(savedPages);
      setRotationPreview(nextRotationPreview);
      setMessage("播放設定已儲存。");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存播放設定失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const resyncPlaybackConfig = async () => {
    setMessage("正在重新同步播放設定...");
    setErrorMessage("");
    setIsSaving(false);
    setIsLoading(true);
    try {
      const {
        nextPages,
        nextRegistryPages,
        nextRotationPreview,
        nextSettings
      } = await loadPlaybackConfig();
      await reloadDisplayOpsSummary();
      applyLoadedPlaybackConfig(nextSettings, nextPages, nextRotationPreview, nextRegistryPages);
      setMessage("播放設定已同步。");
    } catch (error) {
      const nextError = error instanceof Error ? error : new Error("重新同步播放設定失敗。");
      setErrorMessage(nextError.message);
      throw nextError;
    } finally {
      setIsLoading(false);
    }
  };

  const isDirty = useMemo(
    () =>
      hasDisplaySyncDraftChanges(settings, lastSyncedSettings)
      || hasDisplaySyncDraftChanges(pages, lastSyncedPages),
    [lastSyncedPages, lastSyncedSettings, pages, settings]
  );
  const activeRegistryPages = useMemo(
    () => registryPages.filter((page) => page.enabled && page.archivedAt === null),
    [registryPages]
  );
  const registryActionDisabled = isLoading || isSaving || isRegistrySaving || isDirty;
  const registryActionTitle = isDirty
    ? "請先儲存或重新同步目前的播放設定，再管理顯示頁面。"
    : "顯示頁面管理";
  const syncDraftGuard = useDisplaySyncDraftGuard({
    isDirty: isDirty,
    reloadNow: resyncPlaybackConfig
  });

  useDisplaySyncRefresh(syncDraftGuard.handleDisplaySync);

  const viewModel = buildPlaybackSettingsViewModel({
    errorMessage,
    isSaving,
    message,
    pages,
    displayOpsSummary,
    rotationPreview,
    settings
  });

  const statusVariant =
    viewModel.saveBanner.tone === "error"
      ? "is-error"
      : viewModel.saveBanner.tone === "saving"
        ? "is-saving"
        : "";

  const formDisabled = isLoading || !settings;

  const handleCreatePage = async (input: {
    displayNameEn: string;
    displayNameZh: string;
    routeSlug: string;
    templateKey: DisplayPageInstance["templateKey"];
  }) => {
    setIsRegistrySaving(true);
    setErrorMessage("");

    try {
      await createDisplayPageRegistryPage(input);
      await resyncPlaybackConfig();
      setShowAddPageForm(false);
      setMessage(`已新增顯示頁面：${input.displayNameEn}。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "新增顯示頁面失敗。");
    } finally {
      setIsRegistrySaving(false);
    }
  };

  const handleArchivePage = async (page: DisplayPageInstance) => {
    setIsRegistrySaving(true);
    setErrorMessage("");

    try {
      await archiveDisplayPageRegistryPage(page.pageKey);
      await resyncPlaybackConfig();
      setMessage(`已封存顯示頁面：${page.displayNameEn}。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "封存顯示頁面失敗。");
    } finally {
      setIsRegistrySaving(false);
    }
  };

  return (
    <div className="playback-settings-page">
      <div className="ps-header-area">
        <h2 className="ps-header-slogan">綠能驅動・永續未來</h2>
        <section className="ps-title">
          <h1>
            播放<em>設定</em>
          </h1>
          <p>Playback Settings</p>
        </section>
      </div>

      <div className="ps-actions">
        <button
          type="button"
          className="mgmt-action ps-resync"
          disabled={isLoading}
          onClick={() => {
            void resyncPlaybackConfig().catch(() => {});
          }}
        >
          重新同步
          <small>Resync</small>
        </button>
        <button
          type="button"
          className="mgmt-action primary ps-save"
          disabled={formDisabled || isSaving}
          onClick={() => void handleSave()}
        >
          {isSaving ? "儲存中..." : "儲存設定"}
          <small>Save Settings</small>
        </button>
        <button
          type="button"
          className="ps-add-btn"
          disabled={registryActionDisabled}
          title={registryActionTitle}
          aria-label="顯示頁面管理"
          onClick={() => setShowAddPageForm((current) => !current)}
        >
          {showAddPageForm ? "收起頁面管理" : "+ 新增頁面 Add Page"}
        </button>
      </div>

      <div className={`mgmt-status ps-status ${statusVariant}`} role="status">
        {viewModel.saveBanner.title}
        {viewModel.saveBanner.detail ? (
          <>
            <br />
            <span style={{ opacity: 0.75 }}>{viewModel.saveBanner.detail}</span>
          </>
        ) : null}
      </div>

      {syncDraftGuard.hasPendingRemoteChange ? (
        <RemoteSyncBanner
          onKeepEditing={syncDraftGuard.keepEditing}
          onReloadNow={() => syncDraftGuard.discardAndReload().catch(() => {})}
        />
      ) : null}

      <div className={`mgmt-status ${viewModel.displayOpsBanner.tone === "error" ? "is-error" : ""}`} role="status">
        {displayOpsErrorMessage || viewModel.displayOpsBanner.title}
        <small style={{ display: "block", opacity: 0.75 }}>
          {displayOpsErrorMessage || viewModel.displayOpsBanner.detail}
        </small>
      </div>

      <section className="ps-preview">
        <div className="ps-preview__title">
          目前配置輪播鏈 <small>/ Configured Rotation Preview</small>
        </div>
        <div className="ps-preview__list">
          <LiveRotationPreviewList
            definitions={livePreviewCatalog.definitions}
            rows={viewModel.rotationPreviewRows}
            states={livePreviewCatalog.states}
          />
        </div>
        <div className="ps-preview__title" style={{ marginTop: "20px" }}>
          正式生效輪播鏈 <small>/ Effective Runtime Rotation</small>
        </div>
        <div className="ps-preview__list">
          {viewModel.effectiveRotationRows.length > 0 ? (
            <LiveRotationPreviewList
              definitions={livePreviewCatalog.definitions}
              rows={viewModel.effectiveRotationRows}
              states={livePreviewCatalog.states}
            />
          ) : (
            <div className="mgmt-status">
              目前沒有可播放頁面。
              {rotationPreview?.fallbackRoute ? (
                <small style={{ display: "block", opacity: 0.72 }}>Fallback: {rotationPreview.fallbackRoute}</small>
              ) : null}
            </div>
          )}
        </div>
        {viewModel.skippedRotationRows.length > 0 ? (
          <div className="mgmt-status" style={{ marginTop: "16px" }}>
            {viewModel.skippedRotationRows.map((page) => (
              <div key={`${page.labelEn}-${page.skipReasonText}`} style={{ marginTop: "6px" }}>
                {page.labelEn} / {page.labelZh}：{page.skipReasonLabel}
                {page.detail ? <small style={{ display: "block", opacity: 0.72 }}>{page.detail}</small> : null}
              </div>
            ))}
          </div>
        ) : null}
        {viewModel.pendingDraftRows.length > 0 ? (
          <div className="mgmt-status" style={{ marginTop: "16px" }}>
            {viewModel.pendingDraftRows.map((page) => (
              <div key={`${page.labelEn}-${page.publishState}`} style={{ marginTop: "6px" }}>
                {page.labelEn} / {page.labelZh}：目前仍有 {page.publishState} 變更待發布
              </div>
            ))}
          </div>
        ) : null}
      </section>
      <PlaybackSettingsFormSections
        formDisabled={formDisabled}
        isRegistrySaving={isRegistrySaving}
        markDirty={markDirty}
        pages={pages}
        registryActionDisabled={registryActionDisabled}
        registryPages={activeRegistryPages}
        registrySectionLabel="顯示頁面管理"
        onArchivePage={(page) => void handleArchivePage(page)}
        onCreatePage={(input) => void handleCreatePage(input)}
        showAddPageForm={showAddPageForm}
        reorderPlaybackPages={reorderPlaybackPages}
        setPages={setPages}
        settings={settings}
        updateSettingsField={updateSettingsField}
        viewModel={viewModel}
      />
    </div>
  );
}
