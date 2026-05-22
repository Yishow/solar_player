import React from "react";
import { PLAYBACK_ERROR_RELOAD_DELAY_MS } from "../recovery/crashRecovery";
import { createPlaybackReloadBudgetController } from "../recovery/reloadController";

type PlaybackErrorBoundaryProps = React.PropsWithChildren<{
  logError?: (error: unknown, info: React.ErrorInfo) => void;
  onReloadScheduled?: () => void;
  reloadBudget?: {
    allowReload: () => boolean;
  };
  scheduleTimeout?: (callback: () => void, ms: number) => unknown;
}>;

type PlaybackErrorBoundaryState = {
  hasError: boolean;
};

export class PlaybackErrorBoundary extends React.Component<
  PlaybackErrorBoundaryProps,
  PlaybackErrorBoundaryState
> {
  override state: PlaybackErrorBoundaryState = {
    hasError: false
  };

  private reloadTimer: unknown = null;

  static getDerivedStateFromError(_error: unknown) {
    return {
      hasError: true
    };
  }

  override componentDidCatch(error: unknown, info: React.ErrorInfo) {
    this.props.logError?.(error, info);

    const reloadBudget =
      this.props.reloadBudget ?? createPlaybackReloadBudgetController();

    if (!reloadBudget.allowReload()) {
      return;
    }

    const scheduleTimeout = this.props.scheduleTimeout ?? setTimeout;
    this.reloadTimer = scheduleTimeout(() => {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }, PLAYBACK_ERROR_RELOAD_DELAY_MS);
    this.props.onReloadScheduled?.();
  }

  override componentWillUnmount() {
    if (this.reloadTimer !== null) {
      clearTimeout(this.reloadTimer as ReturnType<typeof setTimeout>);
    }
  }

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section
        className="flex h-full w-full items-center justify-center bg-black/80 text-white"
        role="alert"
      >
        <div className="space-y-3 text-center">
          <p className="text-2xl font-semibold">顯示異常</p>
          <p className="text-sm opacity-80">若數秒後仍未恢復，請通知管理員。</p>
        </div>
      </section>
    );
  }
}
