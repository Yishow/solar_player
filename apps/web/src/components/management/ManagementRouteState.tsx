import React from "react";
import { useRevalidator, useRouteError } from "react-router-dom";

export type ManagementRouteStateStatus = "pending" | "error";

export type ManagementRouteStateProps = {
  status: ManagementRouteStateStatus;
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
};

export function ManagementRouteState({
  status,
  title,
  message,
  onRetry,
  className = ""
}: ManagementRouteStateProps) {
  const isPending = status === "pending";
  const defaultTitle = isPending ? "載入管理畫面中..." : "載入管理畫面失敗";
  const defaultMessage = isPending
    ? "正在準備管理介面與版面配置，請稍候。"
    : "連線異常或無法載入畫面模組，請檢查網路連線或稍後重試。";

  return (
    <div
      data-testid={`management-route-${status}`}
      data-route-state={status}
      className={`flex h-full w-full min-h-[360px] flex-col items-center justify-center p-8 text-neutral-800 ${className}`}
    >
      <div className="flex max-w-md flex-col items-center text-center">
        {isPending ? (
          <div
            data-testid="management-route-spinner"
            className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-emerald-600"
            role="status"
            aria-label="載入中"
          />
        ) : (
          <div
            data-testid="management-route-error-icon"
            className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 font-bold"
            aria-hidden="true"
          >
            !
          </div>
        )}

        <h2 className="text-lg font-semibold text-neutral-900 mb-2">
          {title ?? defaultTitle}
        </h2>
        <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
          {message ?? defaultMessage}
        </p>

        {!isPending ? (
          <button
            type="button"
            data-testid="management-route-retry-button"
            onClick={() => {
              if (onRetry) {
                onRetry();
              }
            }}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            重新載入
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ManagementRouteErrorBoundary({
  onRetry
}: {
  onRetry?: () => void;
} = {}) {
  const error = useRouteError();
  let revalidator: ReturnType<typeof useRevalidator> | null = null;
  try {
    revalidator = useRevalidator();
  } catch {
    // Outside Data Router context
  }

  const errorMessage = error instanceof Error ? error.message : String(error ?? "未知錯誤");

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }
    if (revalidator && revalidator.state === "idle") {
      revalidator.revalidate();
    }
  };

  return (
    <ManagementRouteState
      status="error"
      title="管理頁面無法載入"
      message={errorMessage}
      onRetry={handleRetry}
    />
  );
}

export function ManagementNavigationPendingIndicator({
  className = ""
}: {
  className?: string;
}) {
  return (
    <div
      data-testid="management-navigation-pending"
      aria-live="polite"
      aria-label="頁面導覽載入中"
      className={`pointer-events-none absolute inset-x-0 top-0 z-50 h-1 overflow-hidden bg-emerald-100 ${className}`}
    >
      <div className="h-full w-1/3 animate-pulse bg-emerald-600" />
    </div>
  );
}
