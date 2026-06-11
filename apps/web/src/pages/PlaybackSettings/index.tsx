import type {
  DisplayRotationPreview,
  PlaybackPage,
  PlaybackSettings
} from "@solar-display/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RemoteSyncBanner } from "../../components/management/RemoteSyncBanner";
import {
  hasDisplaySyncDraftChanges,
  useDisplaySyncDraftGuard
} from "../../hooks/displaySyncDraftGuard";
import { useDisplayOpsSummary } from "../../hooks/useDisplayOpsSummary";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import {
  updatePlaybackPages,
  updatePlaybackSettings
} from "../../services/api";
import {
  OpsInfoBanner,
  OpsSurface,
  OpsSurfaceTitle
} from "../../components/management";
import { usePlaybackController } from "../../hooks/usePlaybackController";
import "./playbackSettings.css";
import {
  buildPlaybackSettingsFormViewModel,
  buildPlaybackSettingsViewModel,
  reorderPlaybackPages
} from "./viewModel";
import { buildConfiguredRotationRows } from "../DisplayPagesEditor/rotationPreview";
import { PlaybackSettingsFormSections } from "./PlaybackSettingsFormSections";
import { LiveRotationPreviewList } from "./LiveRotationPreviewList";
import { PLAYBACK_SETTINGS_DISPLAY_SYNC_SCOPES } from "../managementDisplaySyncScopes";
import { useLiveDisplayPagePreviewCatalog } from "../shared/useLiveDisplayPagePreviewCatalog";
import {
  loadPlaybackDiagnosticsModel,
  loadPlaybackEditableModel,
  type PlaybackEditableModel
} from "./loadModel";

export function PlaybackSettings() {
  const [settings, setSettings] = useState<PlaybackSettings | null>(null);
  const [lastSyncedSettings, setLastSyncedSettings] = useState<PlaybackSettings | null>(null);
  const [pages, setPages] = useState<PlaybackPage[]>([]);
  const [lastSyncedPages, setLastSyncedPages] = useState<PlaybackPage[]>([]);
  const [rotationPreview, setRotationPreview] = useState<DisplayRotationPreview | null>(null);
  const [rotationPreviewErrorMessage, setRotationPreviewErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("正在同步播放設定...");
  const [errorMessage, setErrorMessage] = useState("");
  const hasEditableModel = Boolean(lastSyncedSettings);
  // Preview rows depend only on the form pages, never on the per-second runtime
  // tick. Memoizing them separately keeps a stable reference so the memoized
  // LiveRotationPreviewList does not re-render every second when only runtime
  // values change. buildConfiguredRotationRows sorts internally, so the result
  // is bit-equivalent to viewModel.configuredRotationRows.
  const configuredRotationRows = useMemo(
    () => buildConfiguredRotationRows(pages),
    [pages]
  );
  const requestedPreviewPageKeys = useMemo(
    () => configuredRotationRows.map((row) => row.pageId),
    [configuredRotationRows]
  );
  const livePreviewCatalog = useLiveDisplayPagePreviewCatalog({
    enabled: hasEditableModel,
    requestedPageKeys: requestedPreviewPageKeys
  });
  const {
    errorMessage: displayOpsErrorMessage,
    reload: reloadDisplayOpsSummary,
    summary: displayOpsSummary
  } = useDisplayOpsSummary({ enabled: hasEditableModel });
  const runtime = usePlaybackController({
    currentPath: "/settings/playback",
    enabled: Boolean(lastSyncedSettings && rotationPreview),
    rotationPreview,
    settings: lastSyncedSettings,
    tickMs: 1000
  });

  const applyLoadedPlaybackEditableModel = (model: PlaybackEditableModel) => {
    setSettings(model.settings);
    setLastSyncedSettings(model.settings);
    setPages(model.pages);
    setLastSyncedPages(model.pages);
  };

  const refreshPlaybackDiagnostics = async (isActive: () => boolean = () => true) => {
    try {
      const { rotationPreview: nextRotationPreview } = await loadPlaybackDiagnosticsModel();
      if (!isActive()) return;
      setRotationPreview(nextRotationPreview);
      setRotationPreviewErrorMessage("");
    } catch (error) {
      if (!isActive()) return;
      setRotationPreviewErrorMessage(error instanceof Error ? error.message : "輪播診斷同步失敗。");
    }
  };

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      setIsLoading(true);
      try {
        const model = await loadPlaybackEditableModel();
        if (!active) return;
        applyLoadedPlaybackEditableModel(model);
        setMessage("播放設定已同步。");
        setErrorMessage("");
        void refreshPlaybackDiagnostics(() => active);
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

  const markDirty = useCallback(() => {
    setMessage("設定已變更，尚未儲存。");
    setErrorMessage("");
  }, []);

  const updateSettingsField = useCallback(<Key extends keyof PlaybackSettings,>(
    key: Key,
    value: PlaybackSettings[Key]
  ) => {
    markDirty();
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }, [markDirty]);

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
      setSettings(savedSettings);
      setLastSyncedSettings(savedSettings);
      setPages(savedPages);
      setLastSyncedPages(savedPages);
      setMessage("播放設定已儲存。");
      setErrorMessage("");
      void refreshPlaybackDiagnostics();
      void reloadDisplayOpsSummary();
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
      const model = await loadPlaybackEditableModel();
      applyLoadedPlaybackEditableModel(model);
      void refreshPlaybackDiagnostics();
      void reloadDisplayOpsSummary();
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
  const syncDraftGuard = useDisplaySyncDraftGuard({
    isDirty: isDirty,
    relevantScopes: PLAYBACK_SETTINGS_DISPLAY_SYNC_SCOPES,
    reloadNow: resyncPlaybackConfig
  });

  useDisplaySyncRefresh(syncDraftGuard.handleDisplaySync, PLAYBACK_SETTINGS_DISPLAY_SYNC_SCOPES);

  const viewModel = useMemo(
    () =>
      buildPlaybackSettingsViewModel({
        errorMessage,
        isSaving,
        message,
        pages,
        runtimeCountdown: runtime.countdown,
        runtimeCurrentPage: runtime.currentPage,
        runtimeErrorMessage: runtime.errorMessage,
        runtimeIsLoading: runtime.isLoading,
        runtimeIsPlaying: runtime.isPlaying,
        runtimeProgress: runtime.progress,
        displayOpsSummary,
        rotationPreview,
        settings
      }),
    [
      errorMessage,
      isSaving,
      message,
      pages,
      runtime.countdown,
      runtime.currentPage,
      runtime.errorMessage,
      runtime.isLoading,
      runtime.isPlaying,
      runtime.progress,
      displayOpsSummary,
      rotationPreview,
      settings
    ]
  );
  const formViewModel = useMemo(
    () => buildPlaybackSettingsFormViewModel({ pages }),
    [pages]
  );

  const statusVariant =
    viewModel.saveBanner.tone === "error"
      ? "is-error"
      : viewModel.saveBanner.tone === "saving"
        ? "is-saving"
        : "";
  const showSaveBanner = statusVariant !== "";
  const previewAlertTone = displayOpsErrorMessage || rotationPreviewErrorMessage
    ? "is-error"
    : viewModel.displayOpsBanner.tone === "error"
      ? "is-error"
      : viewModel.displayOpsBanner.tone === "warning"
        ? "is-warning"
        : "";
  const showPreviewAlert = Boolean(displayOpsErrorMessage || rotationPreviewErrorMessage) || previewAlertTone !== "";

  const formDisabled = isLoading || !settings;

  return (
    <div className="playback-settings-page">
      <div className="ps-header-area">
        <h2 className="ps-header-slogan mgmt-page-kicker">綠能驅動・永續未來</h2>
        <section className="ps-title">
          <h1 className="mgmt-page-title__heading">
            播放<em>設定</em>
          </h1>
          <p className="mgmt-page-title__subtitle">Playback Settings</p>
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
      </div>

      {showSaveBanner ? (
        <div className={`mgmt-status ps-status ${statusVariant}`} role="status">
          {viewModel.saveBanner.title}
          {viewModel.saveBanner.detail ? (
            <>
              <br />
              <span style={{ opacity: 0.75 }}>{viewModel.saveBanner.detail}</span>
            </>
          ) : null}
        </div>
      ) : null}

      {syncDraftGuard.hasPendingRemoteChange ? (
        <RemoteSyncBanner
          onKeepEditing={syncDraftGuard.keepEditing}
          onReloadNow={() => syncDraftGuard.discardAndReload().catch(() => {})}
        />
      ) : null}

      <OpsSurface
        className={`ps-preview${showPreviewAlert ? " ps-preview--with-alert" : ""}`}
        family="preview"
      >
          <OpsSurfaceTitle
            caption="目前設定的輪播預覽"
            className="ps-preview__title"
            title="目前配置輪播鏈"
          />
          {showPreviewAlert ? (
            <OpsInfoBanner
              className="ps-preview__alert"
              detail={rotationPreviewErrorMessage || displayOpsErrorMessage || viewModel.displayOpsBanner.detail}
              title={
                rotationPreviewErrorMessage
                  ? "輪播診斷同步失敗"
                  : displayOpsErrorMessage || viewModel.displayOpsBanner.title
              }
              tone={previewAlertTone === "is-error" ? "error" : "warning"}
            />
          ) : null}
          <div className="ps-preview__list">
            <LiveRotationPreviewList
              definitions={livePreviewCatalog.definitions}
              rows={configuredRotationRows}
              states={livePreviewCatalog.states}
            />
          </div>
      </OpsSurface>
      <PlaybackSettingsFormSections
        formDisabled={formDisabled}
        markDirty={markDirty}
        pages={pages}
        reorderPlaybackPages={reorderPlaybackPages}
        setPages={setPages}
        settings={settings}
        updateSettingsField={updateSettingsField}
        viewModel={formViewModel}
      />
    </div>
  );
}
