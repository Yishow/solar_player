import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ReferenceGlyph } from "../../components/ReferenceGlyph";
import { useDisplayOpsSummary } from "../../hooks/useDisplayOpsSummary";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { useMqttStatus } from "../../hooks/useMqttStatus";
import { getSocketClient } from "../../services/socket";
import { offlineAssetMap, offlineBackgroundLayout, offlinePanelLayout } from "./layout";
import "./offline.css";
import { buildOfflineErrorViewModel } from "./viewModel";

const RETRY_SECONDS = 15;
const CONTENT_TOP_OFFSET = 146;

function withContentOffset<T extends { top: number }>(layout: T) {
  return {
    ...layout,
    top: layout.top - CONTENT_TOP_OFFSET
  };
}

function OfflineHeroIcon() {
  return (
    <svg aria-hidden="true" className="h-full w-full" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 96 96">
      <path d="M48 66 V20" />
      <path d="M28 38 L48 18 L68 38" />
      <path d="M24 72 H72" />
      <path d="M20 82 H76" />
    </svg>
  );
}

export function OfflineError() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lastUpdatedAt } = useLiveMetrics();
  const { summary: displayOpsSummary } = useDisplayOpsSummary();
  const { status } = useMqttStatus();
  const [retryCountdown, setRetryCountdown] = useState(RETRY_SECONDS);

  const returnTo = useMemo(() => {
    const nextPath = (location.state as { returnTo?: string } | null)?.returnTo;
    return nextPath && nextPath !== "/offline" ? nextPath : "/overview";
  }, [location.state]);

  useEffect(() => {
    if (!status.connected) {
      return;
    }

    navigate(returnTo, {
      replace: true
    });
  }, [navigate, returnTo, status.connected]);

  useEffect(() => {
    if (status.connected || status.reason === "mock") {
      return;
    }

    const timer = window.setInterval(() => {
      setRetryCountdown((current) => {
        if (current <= 1) {
          getSocketClient().connect();
          return RETRY_SECONDS;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [status.connected, status.reason]);

  const handleRetry = () => {
    getSocketClient().connect();
    setRetryCountdown(RETRY_SECONDS);
  };

  const viewModel = buildOfflineErrorViewModel({
    lastUpdatedAt: lastUpdatedAt ?? status.updatedAt,
    reason: status.reason,
    retryCountdown,
    returnTo,
    triageSummary: displayOpsSummary?.triageSummary ?? null
  });

  const backgroundLayout = withContentOffset(offlineBackgroundLayout);
  const panelLayout = withContentOffset(offlinePanelLayout);

  return (
    <section className="offline-display-page">
      <figure
        className="offline-background"
        style={{
          height: `${backgroundLayout.height}px`,
          left: `${backgroundLayout.left}px`,
          top: `${backgroundLayout.top}px`,
          width: `${backgroundLayout.width}px`
        }}
      >
        <img alt="離線錯誤背景圖" src={offlineAssetMap.background.src} />
      </figure>

      <section
        className="offline-panel"
        style={{
          left: `${panelLayout.left}px`,
          top: `${panelLayout.top}px`,
          width: `${panelLayout.width}px`
        }}
      >
        <div className="offline-icon-shell">
          <div className="offline-icon-main">
            <OfflineHeroIcon />
          </div>
          <span className="offline-icon-badge">×</span>
        </div>
        <h1>{viewModel.headline}</h1>
        <h2>{viewModel.subtitle}</h2>
        <p>
          系統正在嘗試重新連線中 ...
          <br />
          <span>Reconnecting...</span>
        </p>

        <article className="offline-detail-card">
          {viewModel.guidanceRows.map((row) => (
            <div key={row.label}>
              <b>{row.label}</b>
              <span>{row.value}</span>
            </div>
          ))}
        </article>

        <button className="offline-retry-bar" onClick={handleRetry} type="button">
          <i />
          {viewModel.retryLabel}
        </button>

        <div className="offline-actions">
          <button className="offline-action ghost" onClick={() => navigate("/images")} type="button">
            切換備援輪播
          </button>
          <div className="offline-return-chip">
            <ReferenceGlyph name="refresh" />
            <span>恢復後返回 {viewModel.returnToLabel}</span>
          </div>
        </div>
      </section>
    </section>
  );
}
