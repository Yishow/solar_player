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

.display-page-loading-state__veil {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  opacity: 0.72;
}

.display-page-loading-state__pulse {
  height: 18px;
  width: 18px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(82, 122, 67, 0.92), rgba(111, 140, 92, 0.82));
  box-shadow: 0 0 0 0 rgba(82, 122, 67, 0.26);
  animation: display-page-loading-state-pulse 1.8s ease-out infinite;
}

.display-page-loading-state__accessible-copy {
  position: absolute;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
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
      <span className="display-page-loading-state__accessible-copy">
        {label} {description}
      </span>
      <div aria-hidden="true" className="display-page-loading-state__veil">
        <div aria-hidden="true" className="display-page-loading-state__pulse" />
      </div>
    </section>
  );
}
