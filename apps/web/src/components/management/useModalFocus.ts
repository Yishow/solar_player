import { useLayoutEffect, useRef } from "react";

const focusableSelector = "button, a[href], input, select, textarea, [tabindex]";

function focusableChildren(dialog: HTMLElement) {
  return [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => {
    const style = element.ownerDocument.defaultView!.getComputedStyle(element);
    return element.tabIndex >= 0 && !element.matches(":disabled")
      && !element.closest("[hidden], [inert], [aria-hidden=true]")
      && style.display !== "none" && style.visibility !== "hidden";
  });
}

export function useModalFocus(onClose: () => void, mutationPending: boolean) {
  const dialogRef = useRef<HTMLElement>(null);
  const current = useRef({ onClose, mutationPending });
  current.current = { onClose, mutationPending };

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const document = dialog.ownerDocument;
    const trigger = document.activeElement as HTMLElement | null;
    const fallback = dialog.closest<HTMLElement>("[data-dialog-focus-fallback]");
    const focusInside = () => {
      const controls = focusableChildren(dialog);
      (controls.find((control) => control.hasAttribute("data-dialog-initial-focus")) ?? controls[0] ?? dialog).focus();
    };
    const handleFocus = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) focusInside();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!current.current.mutationPending) current.current.onClose();
      } else if (event.key === "Tab") {
        const controls = focusableChildren(dialog);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first || !controls.includes(document.activeElement as HTMLElement)) {
          event.preventDefault();
          (event.shiftKey ? last ?? dialog : first ?? dialog).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last!.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("focusin", handleFocus);
    document.addEventListener("keydown", handleKey, true);
    focusInside();
    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("keydown", handleKey, true);
      if (trigger?.isConnected && !trigger.matches(":disabled") && trigger !== document.body) trigger.focus();
      else if (fallback?.isConnected) fallback.focus();
    };
  }, []);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const controls = focusableChildren(dialog);
    if (!controls.includes(dialog.ownerDocument.activeElement as HTMLElement)) {
      (controls.find((control) => control.hasAttribute("data-dialog-initial-focus")) ?? controls[0] ?? dialog).focus();
    }
  }, [mutationPending]);

  return dialogRef;
}
