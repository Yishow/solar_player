import React from "react";

export const displayPageLoadingStateStyles = `
.display-page-loading-state {
  position: relative;
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 24% 18%, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0) 22%),
    radial-gradient(circle at 78% 72%, rgba(104, 130, 66, 0.12), rgba(104, 130, 66, 0) 24%),
    var(--stage-bg);
  color: var(--ink);
}

.display-page-loading-state__panel {
  position: relative;
  display: flex;
  min-width: 420px;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  border: 1px solid rgba(89, 124, 67, 0.18);
  border-radius: 24px;
  background: rgba(255, 253, 248, 0.86);
  box-shadow: 0 18px 38px rgba(55, 50, 38, 0.12);
  padding: 32px 40px;
  text-align: center;
}

.display-page-loading-state__pulse {
  height: 18px;
  width: 18px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(82, 122, 67, 0.92), rgba(111, 140, 92, 0.82));
  box-shadow: 0 0 0 0 rgba(82, 122, 67, 0.26);
  animation: display-page-loading-state-pulse 1.8s ease-out infinite;
}

.display-page-loading-state__headline {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.06em;
  line-height: 1.35;
}

.display-page-loading-state__copy {
  max-width: 480px;
  color: var(--muted);
  font-size: 18px;
  line-height: 1.7;
}

@keyframes display-page-loading-state-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(82, 122, 67, 0.28);
    transform: scale(0.92);
  }

  70% {
    box-shadow: 0 0 0 20px rgba(82, 122, 67, 0);
    transform: scale(1);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(82, 122, 67, 0);
    transform: scale(0.92);
  }
}

@media (prefers-reduced-motion: reduce) {
  .display-page-loading-state__pulse {
    animation: none;
  }
}
`;

export function DisplayPageLoadingState({
  description = "正在同步展示頁設定與即時資料，完成後會自動顯示內容。",
  label = "載入展示頁…"
}: {
  description?: string;
  label?: string;
}) {
  return (
    <section
      aria-live="polite"
      className="display-page-loading-state"
      role="status"
    >
      <style>{displayPageLoadingStateStyles}</style>
      <div className="display-page-loading-state__panel">
        <div aria-hidden="true" className="display-page-loading-state__pulse" />
        <strong className="display-page-loading-state__headline">{label}</strong>
        <p className="display-page-loading-state__copy">{description}</p>
      </div>
    </section>
  );
}
