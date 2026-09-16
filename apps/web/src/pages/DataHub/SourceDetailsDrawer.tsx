import { useEffect, useRef, type ReactNode, type RefObject } from "react";

export type SourceDetailsDrawerProps = {
  activeSection?: "overview" | "mapping" | "samples" | "usage";
  children: ReactNode;
  footerActions?: ReactNode;
  headerBadge?: ReactNode;
  isFullPanel?: boolean;
  onClose: () => void;
  onSectionChange?: (section: "overview" | "mapping" | "samples" | "usage") => void;
  onTogglePanelMode?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  showSections?: boolean;
  title: string;
};

export function SourceDetailsDrawer({
  activeSection = "overview",
  children,
  footerActions,
  headerBadge,
  isFullPanel = false,
  onClose,
  onSectionChange,
  onTogglePanelMode,
  returnFocusRef,
  showSections = false,
  title
}: SourceDetailsDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const returnFocusRefRef = useRef(returnFocusRef);
  returnFocusRefRef.current = returnFocusRef;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const focusTarget = panel?.querySelector<HTMLElement>(
      "input:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex='-1'])"
    );
    focusTarget?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) {
        return;
      }
      const focusable = [...panel.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"
      )].filter((node) => !node.hasAttribute("disabled") && node.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;

      // Safe return focus with fallback
      const target = returnFocusRefRef.current?.current;
      if (target && target.isConnected) {
        target.focus();
      } else {
        const fallback = document.querySelector<HTMLElement>(
          '[data-source-summary-list] button, input[aria-label="搜尋來源"], h1, h2'
        );
        fallback?.focus();
      }
    };
  }, []); // Run setup and teardown only on true open/close lifecycle

  return (
    <div
      className="fixed inset-0 z-30 flex justify-end bg-[#1e2821]/30 transition-opacity"
      data-source-drawer-backdrop
    >
      <div
        aria-labelledby="source-drawer-title"
        aria-modal="true"
        className={`flex h-[100dvh] flex-col overflow-hidden bg-white shadow-2xl transition-all duration-200 ${
          isFullPanel ? "w-full max-w-5xl" : "w-full max-w-xl"
        }`}
        data-source-drawer
        data-workspace-safe-viewport="1366"
        ref={panelRef}
        role="dialog"
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf2ee] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-[#1e2821]" id="source-drawer-title">
              {title}
            </h2>
            {headerBadge}
          </div>

          <div className="flex items-center gap-1.5">
            {onTogglePanelMode ? (
              <button
                className="mgmt-action min-h-[40px] px-2.5 text-xs text-[#4d554f]"
                data-drawer-toggle-panel
                onClick={onTogglePanelMode}
                title={isFullPanel ? "收攏為側欄" : "展開為完整工作區"}
                type="button"
              >
                {isFullPanel ? "收攏側欄" : "展開工作區"}
              </button>
            ) : null}
            <button
              aria-label="關閉"
              className="mgmt-action min-h-[40px] min-w-[40px]"
              data-drawer-close
              onClick={onClose}
              type="button"
            >
              關閉
            </button>
          </div>
        </header>

        {showSections && onSectionChange ? (
          <div className="flex border-b border-[#edf2ee] px-4">
            <button
              aria-selected={activeSection === "overview"}
              className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors min-h-[36px] ${
                activeSection === "overview"
                  ? "border-[#1b4332] text-[#1b4332]"
                  : "border-transparent text-[#687169] hover:text-[#2d3730]"
              }`}
              data-drawer-tab="overview"
              onClick={() => onSectionChange("overview")}
              type="button"
            >
              概覽
            </button>
            <button
              aria-selected={activeSection === "mapping"}
              className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors min-h-[36px] ${
                activeSection === "mapping"
                  ? "border-[#1b4332] text-[#1b4332]"
                  : "border-transparent text-[#687169] hover:text-[#2d3730]"
              }`}
              data-drawer-tab="mapping"
              onClick={() => onSectionChange("mapping")}
              type="button"
            >
              對應與轉換
            </button>
            <button
              aria-selected={activeSection === "samples"}
              className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors min-h-[36px] ${
                activeSection === "samples"
                  ? "border-[#1b4332] text-[#1b4332]"
                  : "border-transparent text-[#687169] hover:text-[#2d3730]"
              }`}
              data-drawer-tab="samples"
              onClick={() => onSectionChange("samples")}
              type="button"
            >
              接收樣本
            </button>
            <button
              aria-selected={activeSection === "usage"}
              className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors min-h-[36px] ${
                activeSection === "usage"
                  ? "border-[#1b4332] text-[#1b4332]"
                  : "border-transparent text-[#687169] hover:text-[#2d3730]"
              }`}
              data-drawer-tab="usage"
              onClick={() => onSectionChange("usage")}
              type="button"
            >
              使用情況
            </button>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-drawer-content>
          {children}
        </div>

        <footer
          className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf2ee] bg-white px-4 py-3"
          data-drawer-actions
        >
          <div className="flex flex-wrap items-center gap-2">
            {footerActions}
          </div>
          <button className="mgmt-action min-h-[40px]" onClick={onClose} type="button">
            關閉抽屜
          </button>
        </footer>
      </div>
    </div>
  );
}
