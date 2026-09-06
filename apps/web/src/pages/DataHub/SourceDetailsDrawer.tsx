import { useEffect, useRef, type ReactNode, type RefObject } from "react";

export function SourceDetailsDrawer({
  children,
  onClose,
  returnFocusRef,
  title
}: {
  children: ReactNode;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  title: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const focusTarget = panel?.querySelector<HTMLElement>("input, select, button, [tabindex]:not([tabindex='-1'])");
    focusTarget?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab" || !panel) {
        return;
      }
      const focusable = [...panel.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"
      )].filter((node) => !node.hasAttribute("disabled"));
      if (focusable.length === 0) {
        return;
      }
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
      returnFocusRef?.current?.focus();
    };
  }, [onClose, returnFocusRef]);

  return (
    <div
      className="fixed inset-0 z-30 flex justify-end bg-[#1e2821]/30"
      data-source-drawer-backdrop
    >
      <div
        aria-labelledby="source-drawer-title"
        aria-modal="true"
        className="flex h-[100dvh] w-full max-w-xl flex-col overflow-hidden bg-white shadow-lg"
        data-source-drawer
        data-workspace-safe-viewport="1366"
        ref={panelRef}
        role="dialog"
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf2ee] px-4 py-3">
          <h2 className="text-[14px] font-semibold text-[#1e2821]" id="source-drawer-title">{title}</h2>
          <button
            className="mgmt-action min-h-[40px] min-w-[40px]"
            onClick={onClose}
            type="button"
          >
            關閉
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>
        <footer
          className="sticky bottom-0 flex flex-wrap gap-2 border-t border-[#edf2ee] bg-white px-4 py-3"
          data-drawer-actions
        >
          <button className="mgmt-action min-h-[40px]" onClick={onClose} type="button">
            關閉抽屜
          </button>
        </footer>
      </div>
    </div>
  );
}
